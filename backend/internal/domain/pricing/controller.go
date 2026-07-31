package pricing

import (
	transport "pricing-hub/backend/internal/infrastructure/http"

	"github.com/gofiber/fiber/v2"
)

type Controller struct {
	service *PricingService
}

func NewController(service *PricingService) *Controller {
	return &Controller{service: service}
}

func (h *Controller) Calculate(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	result, err := h.service.CalculateForChannel(c.Context(), body.ToInput())
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(result)
}
