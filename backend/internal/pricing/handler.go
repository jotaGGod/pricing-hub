package pricing

import (
	"strings"

	"pricing-hub/backend/internal/channel"
	"pricing-hub/backend/internal/core"
	transport "pricing-hub/backend/internal/transport/http"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	channels channel.Repository
	service  *PricingService
}

func NewHandler(channels channel.Repository, service *PricingService) *Handler {
	return &Handler{channels: channels, service: service}
}

func (h *Handler) Calculate(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	input := body.ToInput()
	input.ChannelCode = strings.TrimSpace(input.ChannelCode)
	if input.ChannelCode == "" {
		return transport.RespondError(c, core.ErrInvalidInput)
	}
	salesChannel, err := h.channels.FindByCode(c.Context(), input.ChannelCode)
	if err != nil {
		return transport.RespondError(c, err)
	}
	result, err := h.service.Calculate(input, salesChannel)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(result)
}
