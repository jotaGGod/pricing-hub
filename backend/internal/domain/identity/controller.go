package identity

import (
	"time"

	"pricing-hub/backend/internal/infrastructure/config"
	transport "pricing-hub/backend/internal/infrastructure/http"

	"github.com/gofiber/fiber/v2"
)

type Controller struct {
	cfg     config.Config
	service *Service
}

func NewController(cfg config.Config, service *Service) *Controller {
	return &Controller{cfg: cfg, service: service}
}

func (h *Controller) Register(c *fiber.Ctx) error {
	body, err := transport.ParseBody[RegisterRequest](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	user, tokens, err := h.service.Register(c.Context(), body.Name, body.Email, body.Password)
	if err != nil {
		return transport.RespondError(c, err)
	}
	h.setSessionCookies(c, tokens)
	return c.Status(fiber.StatusCreated).JSON(AuthResponse{User: toUserResponse(user)})
}

func (h *Controller) Login(c *fiber.Ctx) error {
	body, err := transport.ParseBody[LoginRequest](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	user, tokens, err := h.service.Login(c.Context(), body.Email, body.Password)
	if err != nil {
		return transport.RespondError(c, err)
	}
	h.setSessionCookies(c, tokens)
	return c.JSON(AuthResponse{User: toUserResponse(user)})
}

func (h *Controller) Logout(c *fiber.Ctx) error {
	h.service.Logout(c.Context(), c.Cookies("refresh_token"))
	h.clearAuthCookies(c)
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Controller) Refresh(c *fiber.Ctx) error {
	accessToken, accessExpiresAt, err := h.service.Refresh(c.Context(), c.Cookies("refresh_token"))
	if err != nil {
		return transport.RespondError(c, err)
	}
	h.setAccessCookie(c, accessToken, accessExpiresAt)
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Controller) Me(c *fiber.Ctx) error {
	user, err := h.service.Me(c.Context(), transport.UserID(c))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(AuthResponse{User: toUserResponse(user)})
}

func (h *Controller) GoogleStart(c *fiber.Ctx) error {
	state, authURL, err := h.service.GoogleAuthURL()
	if err != nil {
		return transport.RespondError(c, err)
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

func (h *Controller) GoogleCallback(c *fiber.Ctx) error {
	_, tokens, err := h.service.GoogleCallback(c.Context(), c.Query("state"), c.Cookies("oauth_state"), c.Query("code"))
	if err != nil {
		return transport.RespondError(c, err)
	}
	h.setSessionCookies(c, tokens)
	h.clearCookie(c, "oauth_state")
	return c.Redirect(h.service.PostLoginRedirectURL(), fiber.StatusTemporaryRedirect)
}

func (h *Controller) setSessionCookies(c *fiber.Ctx, tokens SessionTokens) {
	h.setAccessCookie(c, tokens.AccessToken, tokens.AccessExpiresAt)
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
		Expires:  tokens.RefreshExpiresAt,
	})
}

func (h *Controller) setAccessCookie(c *fiber.Ctx, token string, expiresAt time.Time) {
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

func (h *Controller) clearAuthCookies(c *fiber.Ctx) {
	h.clearCookie(c, "access_token")
	h.clearCookie(c, "refresh_token")
}

func (h *Controller) clearCookie(c *fiber.Ctx, name string) {
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
