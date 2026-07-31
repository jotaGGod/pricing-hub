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

func (h *Handler) UpdateDefaultCosts(c *fiber.Ctx) error {
	body, err := transport.ParseBody[DefaultCosts](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	if err := validateDefaultCosts(body); err != nil {
		return transport.RespondError(c, err)
	}
	preference, err := h.preferences.UpsertDefaultCosts(c.Context(), transport.UserID(c), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(preference)
}

func validateDefaultCosts(costs DefaultCosts) error {
	if costs.TaxBPS < 0 || costs.AdsBPS < 0 || costs.FixedCostsBPS < 0 || costs.ExtraFeesBPS < 0 || costs.SellerDiscountBPS < 0 {
		return core.ErrInvalidInput
	}
	if costs.LogisticCost.AmountCents < 0 || costs.LogisticCost.BPS < 0 {
		return core.ErrInvalidInput
	}
	for _, cost := range costs.ManualCosts {
		if cost.AmountCents < 0 || cost.BPS < 0 {
			return core.ErrInvalidInput
		}
	}
	return nil
}
