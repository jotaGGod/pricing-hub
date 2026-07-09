package handlers

import (
	"errors"
	"net/url"
	"strings"
	"time"

	"pricing-hub/backend/internal/domain"
	"pricing-hub/backend/internal/infra/auth"
	"pricing-hub/backend/internal/infra/config"
	"pricing-hub/backend/internal/infra/http/dto"
	"pricing-hub/backend/internal/infra/http/middlewares"
	googleoauth "pricing-hub/backend/internal/infra/oauth"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	cfg          config.Config
	users        domain.UserRepository
	sessions     domain.SessionRepository
	preferences  domain.PreferenceRepository
	tokenService *auth.TokenService
	googleOAuth  *googleoauth.GoogleOAuth
}

func NewAuthHandler(
	cfg config.Config,
	users domain.UserRepository,
	sessions domain.SessionRepository,
	preferences domain.PreferenceRepository,
	tokenService *auth.TokenService,
	googleOAuth *googleoauth.GoogleOAuth,
) *AuthHandler {
	return &AuthHandler{
		cfg:          cfg,
		users:        users,
		sessions:     sessions,
		preferences:  preferences,
		tokenService: tokenService,
		googleOAuth:  googleOAuth,
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	body, err := parseBody[dto.RegisterRequest](c)
	if err != nil {
		return respondError(c, err)
	}
	body.Name = strings.TrimSpace(body.Name)
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Name == "" || body.Email == "" || len(body.Password) < 6 {
		return respondError(c, domain.ErrInvalidInput)
	}

	passwordHash, err := auth.HashPassword(body.Password)
	if err != nil {
		return respondError(c, err)
	}
	user, err := h.users.Create(c.Context(), domain.User{
		Name:         body.Name,
		Email:        body.Email,
		PasswordHash: &passwordHash,
	})
	if err != nil {
		return respondError(c, err)
	}
	_, _ = h.preferences.Get(c.Context(), user.ID)

	if err := h.createSessionCookies(c, user.ID); err != nil {
		return respondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(dto.AuthResponse{User: toUserResponse(user)})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	body, err := parseBody[dto.LoginRequest](c)
	if err != nil {
		return respondError(c, err)
	}
	user, err := h.users.FindByEmail(c.Context(), strings.TrimSpace(strings.ToLower(body.Email)))
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return respondError(c, domain.ErrInvalidCredential)
		}
		return respondError(c, err)
	}
	if user.PasswordHash == nil || !auth.ComparePassword(*user.PasswordHash, body.Password) {
		return respondError(c, domain.ErrInvalidCredential)
	}
	if err := h.createSessionCookies(c, user.ID); err != nil {
		return respondError(c, err)
	}
	return c.JSON(dto.AuthResponse{User: toUserResponse(user)})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken != "" {
		session, err := h.sessions.FindByRefreshTokenHash(c.Context(), auth.HashRefreshToken(refreshToken))
		if err == nil {
			_ = h.sessions.Revoke(c.Context(), session.ID)
		}
	}
	h.clearAuthCookies(c)
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		return respondError(c, domain.ErrUnauthorized)
	}
	session, err := h.sessions.FindByRefreshTokenHash(c.Context(), auth.HashRefreshToken(refreshToken))
	if err != nil {
		return respondError(c, domain.ErrUnauthorized)
	}
	if session.RevokedAt != nil || time.Now().After(session.ExpiresAt) {
		return respondError(c, domain.ErrUnauthorized)
	}

	accessToken, accessExpiresAt, err := h.tokenService.IssueAccessToken(session.UserID, session.ID)
	if err != nil {
		return respondError(c, err)
	}
	h.setAccessCookie(c, accessToken, accessExpiresAt)
	return c.JSON(fiber.Map{"ok": true})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	user, err := h.users.FindByID(c.Context(), middlewares.UserID(c))
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(dto.AuthResponse{User: toUserResponse(user)})
}

func (h *AuthHandler) GoogleStart(c *fiber.Ctx) error {
	state, err := auth.NewStateToken()
	if err != nil {
		return respondError(c, err)
	}
	authURL, err := h.googleOAuth.AuthCodeURL(state)
	if err != nil {
		return respondError(c, domain.ErrInvalidInput)
	}
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
		Expires:  time.Now().Add(10 * time.Minute),
	})
	return c.Redirect(authURL, fiber.StatusTemporaryRedirect)
}

func (h *AuthHandler) GoogleCallback(c *fiber.Ctx) error {
	if c.Query("state") == "" || c.Query("state") != c.Cookies("oauth_state") {
		return respondError(c, domain.ErrUnauthorized)
	}
	googleUser, err := h.googleOAuth.ExchangeUser(c.Context(), c.Query("code"))
	if err != nil {
		return respondError(c, err)
	}

	avatar := googleUser.Picture
	user, err := h.users.FindByEmail(c.Context(), googleUser.Email)
	if errors.Is(err, domain.ErrNotFound) {
		user, err = h.users.Create(c.Context(), domain.User{
			Name:      googleUser.Name,
			Email:     googleUser.Email,
			GoogleID:  &googleUser.ID,
			AvatarURL: &avatar,
		})
	} else if err == nil && (user.GoogleID == nil || *user.GoogleID != googleUser.ID) {
		user, err = h.users.LinkGoogle(c.Context(), user.ID, googleUser.ID, &avatar)
	}
	if err != nil {
		return respondError(c, err)
	}
	_, _ = h.preferences.Get(c.Context(), user.ID)
	if err := h.createSessionCookies(c, user.ID); err != nil {
		return respondError(c, err)
	}
	h.clearCookie(c, "oauth_state")

	redirectTo := strings.TrimRight(h.cfg.FrontendURL, "/") + "/pricing"
	if _, err := url.Parse(redirectTo); err != nil {
		redirectTo = "/pricing"
	}
	return c.Redirect(redirectTo, fiber.StatusTemporaryRedirect)
}

func (h *AuthHandler) createSessionCookies(c *fiber.Ctx, userID string) error {
	refreshToken, refreshHash, err := auth.NewRefreshToken()
	if err != nil {
		return err
	}
	session, err := h.sessions.Create(c.Context(), domain.Session{
		UserID:           userID,
		RefreshTokenHash: refreshHash,
		ExpiresAt:        time.Now().Add(h.tokenService.RefreshTTL()),
	})
	if err != nil {
		return err
	}
	accessToken, accessExpiresAt, err := h.tokenService.IssueAccessToken(userID, session.ID)
	if err != nil {
		return err
	}
	h.setAccessCookie(c, accessToken, accessExpiresAt)
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
		Expires:  session.ExpiresAt,
	})
	return nil
}

func (h *AuthHandler) setAccessCookie(c *fiber.Ctx, token string, expiresAt time.Time) {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    token,
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
		Expires:  expiresAt,
	})
}

func (h *AuthHandler) clearAuthCookies(c *fiber.Ctx) {
	h.clearCookie(c, "access_token")
	h.clearCookie(c, "refresh_token")
}

func (h *AuthHandler) clearCookie(c *fiber.Ctx, name string) {
	c.Cookie(&fiber.Cookie{
		Name:     name,
		Value:    "",
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
		Expires:  time.Now().Add(-time.Hour),
		MaxAge:   -1,
	})
}

func toUserResponse(user domain.User) dto.UserResponse {
	return dto.UserResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		AvatarURL: user.AvatarURL,
	}
}
