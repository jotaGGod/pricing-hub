package handlers

import (
	"strings"

	"pricing-hub/backend/internal/domain"
	"pricing-hub/backend/internal/infra/http/dto"

	"github.com/gofiber/fiber/v2"
)

type PricingHandler struct {
	channels domain.ChannelRepository
	service  *domain.PricingService
}

func NewPricingHandler(channels domain.ChannelRepository, service *domain.PricingService) *PricingHandler {
	return &PricingHandler{channels: channels, service: service}
}

func (h *PricingHandler) Calculate(c *fiber.Ctx) error {
	body, err := parseBody[dto.PricingRequest](c)
	if err != nil {
		return respondError(c, err)
	}
	input := body.ToDomain()
	input.ChannelCode = strings.TrimSpace(input.ChannelCode)
	if input.ChannelCode == "" {
		return respondError(c, domain.ErrInvalidInput)
	}
	channel, err := h.channels.FindByCode(c.Context(), input.ChannelCode)
	if err != nil {
		return respondError(c, err)
	}
	result, err := h.service.Calculate(input, channel)
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(result)
}
