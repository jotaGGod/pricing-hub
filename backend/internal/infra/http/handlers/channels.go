package handlers

import (
	"pricing-hub/backend/internal/domain"

	"github.com/gofiber/fiber/v2"
)

type ChannelHandler struct {
	channels domain.ChannelRepository
}

func NewChannelHandler(channels domain.ChannelRepository) *ChannelHandler {
	return &ChannelHandler{channels: channels}
}

func (h *ChannelHandler) List(c *fiber.Ctx) error {
	channels, err := h.channels.List(c.Context())
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(channels)
}

func (h *ChannelHandler) Get(c *fiber.Ctx) error {
	channel, err := h.channels.FindByCode(c.Context(), c.Params("code"))
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(channel)
}
