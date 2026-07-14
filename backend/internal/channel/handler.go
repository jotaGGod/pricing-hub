package channel

import (
	transport "pricing-hub/backend/internal/transport/http"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	channels Repository
}

func NewHandler(channels Repository) *Handler {
	return &Handler{channels: channels}
}

func (h *Handler) List(c *fiber.Ctx) error {
	channels, err := h.channels.List(c.Context())
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(channels)
}

func (h *Handler) Get(c *fiber.Ctx) error {
	channel, err := h.channels.FindByCode(c.Context(), c.Params("code"))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(channel)
}
