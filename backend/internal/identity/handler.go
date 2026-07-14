package identity

import (
	"errors"
	"net/url"
	"strings"
	"time"

	"pricing-hub/backend/internal/core"
	"pricing-hub/backend/internal/infra/auth"
	"pricing-hub/backend/internal/infra/config"
	googleoauth "pricing-hub/backend/internal/infra/oauth"
	"pricing-hub/backend/internal/preferences"
	transport "pricing-hub/backend/internal/transport/http"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	cfg          config.Config
	users        UserRepository
	sessions     SessionRepository
	preferences  preferences.Repository
	tokenService *auth.TokenService
	googleOAuth  *googleoauth.GoogleOAuth
}

func NewHandler(
	cfg config.Config,
	users UserRepository,
	sessions SessionRepository,
	preferences preferences.Repository,
	tokenService *auth.TokenService,
	googleOAuth *googleoauth.GoogleOAuth,
) *Handler {
	return &Handler{
		cfg:          cfg,
		users:        users,
		sessions:     sessions,
		preferences:  preferences,
		tokenService: tokenService,
		googleOAuth:  googleOAuth,
	}
}

func (h *Handler) Register(c *fiber.Ctx) error {
	body, err := transport.ParseBody[RegisterRequest](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	body.Name = strings.TrimSpace(body.Name)
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Name == "" || body.Email == "" || len(body.Password) < 6 {
		return transport.RespondError(c, core.ErrInvalidInput)
	}

	passwordHash, err := auth.HashPassword(body.Password)
	if err != nil {
		return transport.RespondError(c, err)
	}
	user, err := h.users.Create(c.Context(), User{
		Name:         body.Name,
		Email:        body.Email,
		PasswordHash: &passwordHash,
	})
	if err != nil {
		return transport.RespondError(c, err)
	}
	_, _ = h.preferences.Get(c.Context(), user.ID)

	if err := h.createSessionCookies(c, user.ID); err != nil {
		return transport.RespondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(AuthResponse{User: toUserResponse(user)})
}

func (h *Handler) Login(c *fiber.Ctx) error {
	body, err := transport.ParseBody[LoginRequest](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	user, err := h.users.FindByEmail(c.Context(), strings.TrimSpace(strings.ToLower(body.Email)))
	if err != nil {
		if errors.Is(err, core.ErrNotFound) {
			return transport.RespondError(c, core.ErrInvalidCredential)
		}
		return transport.RespondError(c, err)
	}
	if user.PasswordHash == nil || !auth.ComparePassword(*user.PasswordHash, body.Password) {
		return transport.RespondError(c, core.ErrInvalidCredential)
	}
	if err := h.createSessionCookies(c, user.ID); err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(AuthResponse{User: toUserResponse(user)})
}

func (h *Handler) Logout(c *fiber.Ctx) error {
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

func (h *Handler) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		return transport.RespondError(c, core.ErrUnauthorized)
	}
	session, err := h.sessions.FindByRefreshTokenHash(c.Context(), auth.HashRefreshToken(refreshToken))
	if err != nil {
		return transport.RespondError(c, core.ErrUnauthorized)
	}
	if session.RevokedAt != nil || time.Now().After(session.ExpiresAt) {
		return transport.RespondError(c, core.ErrUnauthorized)
	}

	accessToken, accessExpiresAt, err := h.tokenService.IssueAccessToken(session.UserID, session.ID)
	if err != nil {
		return transport.RespondError(c, err)
	}
	h.setAccessCookie(c, accessToken, accessExpiresAt)
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) Me(c *fiber.Ctx) error {
	user, err := h.users.FindByID(c.Context(), transport.UserID(c))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(AuthResponse{User: toUserResponse(user)})
}

func (h *Handler) GoogleStart(c *fiber.Ctx) error {
	state, err := auth.NewStateToken()
	if err != nil {
		return transport.RespondError(c, err)
	}
	authURL, err := h.googleOAuth.AuthCodeURL(state)
	if err != nil {
		return transport.RespondError(c, core.ErrInvalidInput)
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

func (h *Handler) GoogleCallback(c *fiber.Ctx) error {
	if c.Query("state") == "" || c.Query("state") != c.Cookies("oauth_state") {
		return transport.RespondError(c, core.ErrUnauthorized)
	}
	googleUser, err := h.googleOAuth.ExchangeUser(c.Context(), c.Query("code"))
	if err != nil {
		return transport.RespondError(c, err)
	}

	avatar := googleUser.Picture
	user, err := h.users.FindByEmail(c.Context(), googleUser.Email)
	if errors.Is(err, core.ErrNotFound) {
		user, err = h.users.Create(c.Context(), User{
			Name:      googleUser.Name,
			Email:     googleUser.Email,
			GoogleID:  &googleUser.ID,
			AvatarURL: &avatar,
		})
	} else if err == nil && (user.GoogleID == nil || *user.GoogleID != googleUser.ID) {
		user, err = h.users.LinkGoogle(c.Context(), user.ID, googleUser.ID, &avatar)
	}
	if err != nil {
		return transport.RespondError(c, err)
	}
	_, _ = h.preferences.Get(c.Context(), user.ID)
	if err := h.createSessionCookies(c, user.ID); err != nil {
		return transport.RespondError(c, err)
	}
	h.clearCookie(c, "oauth_state")

	redirectTo := strings.TrimRight(h.cfg.FrontendURL, "/") + "/pricing"
	if _, err := url.Parse(redirectTo); err != nil {
		redirectTo = "/pricing"
	}
	return c.Redirect(redirectTo, fiber.StatusTemporaryRedirect)
}

func (h *Handler) createSessionCookies(c *fiber.Ctx, userID string) error {
	refreshToken, refreshHash, err := auth.NewRefreshToken()
	if err != nil {
		return err
	}
	session, err := h.sessions.Create(c.Context(), Session{
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

func (h *Handler) setAccessCookie(c *fiber.Ctx, token string, expiresAt time.Time) {
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

func (h *Handler) clearAuthCookies(c *fiber.Ctx) {
	h.clearCookie(c, "access_token")
	h.clearCookie(c, "refresh_token")
}

func (h *Handler) clearCookie(c *fiber.Ctx, name string) {
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

func toUserResponse(user User) UserResponse {
	return UserResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		AvatarURL: user.AvatarURL,
	}
}
