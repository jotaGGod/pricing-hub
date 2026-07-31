package preferences

import (
	transport "pricing-hub/backend/internal/infrastructure/http"

	"github.com/gofiber/fiber/v2"
)

type Controller struct {
	service *Service
}

func NewController(service *Service) *Controller {
	return &Controller{service: service}
}

func (h *Controller) Get(c *fiber.Ctx) error {
	preference, err := h.service.Get(c.Context(), transport.UserID(c))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(preference)
}

func (h *Controller) UpdateTheme(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	preference, err := h.service.UpdateTheme(c.Context(), transport.UserID(c), body.Theme)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(preference)
}

func (h *Controller) UpdateDefaultCosts(c *fiber.Ctx) error {
	body, err := transport.ParseBody[DefaultCosts](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	preference, err := h.service.UpdateDefaultCosts(c.Context(), transport.UserID(c), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(preference)
}
