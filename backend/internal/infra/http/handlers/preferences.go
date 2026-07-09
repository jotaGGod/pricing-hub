package handlers

import (
	"pricing-hub/backend/internal/domain"
	"pricing-hub/backend/internal/infra/http/dto"
	"pricing-hub/backend/internal/infra/http/middlewares"

	"github.com/gofiber/fiber/v2"
)

type PreferenceHandler struct {
	preferences domain.PreferenceRepository
}

func NewPreferenceHandler(preferences domain.PreferenceRepository) *PreferenceHandler {
	return &PreferenceHandler{preferences: preferences}
}

func (h *PreferenceHandler) Get(c *fiber.Ctx) error {
	preference, err := h.preferences.Get(c.Context(), middlewares.UserID(c))
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(preference)
}

func (h *PreferenceHandler) UpdateTheme(c *fiber.Ctx) error {
	body, err := parseBody[dto.ThemeRequest](c)
	if err != nil {
		return respondError(c, err)
	}
	if body.Theme != domain.ThemeDark && body.Theme != domain.ThemeLight {
		return respondError(c, domain.ErrInvalidInput)
	}
	preference, err := h.preferences.UpsertTheme(c.Context(), middlewares.UserID(c), body.Theme)
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(preference)
}
