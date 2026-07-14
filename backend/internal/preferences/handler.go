package preferences

import (
	"pricing-hub/backend/internal/core"
	transport "pricing-hub/backend/internal/transport/http"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	preferences Repository
}

func NewHandler(preferences Repository) *Handler {
	return &Handler{preferences: preferences}
}

func (h *Handler) Get(c *fiber.Ctx) error {
	preference, err := h.preferences.Get(c.Context(), transport.UserID(c))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(preference)
}

func (h *Handler) UpdateTheme(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	if body.Theme != ThemeDark && body.Theme != ThemeLight {
		return transport.RespondError(c, core.ErrInvalidInput)
	}
	preference, err := h.preferences.UpsertTheme(c.Context(), transport.UserID(c), body.Theme)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(preference)
}
