package channel

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

func (h *Controller) List(c *fiber.Ctx) error {
	channels, err := h.service.List(c.Context())
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(channels)
}

func (h *Controller) Get(c *fiber.Ctx) error {
	channel, err := h.service.FindByCode(c.Context(), c.Params("code"))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(channel)
}
