package simulation

import (
	"strings"

	"pricing-hub/backend/internal/core"
	transport "pricing-hub/backend/internal/transport/http"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	simulations Repository
}

func NewHandler(simulations Repository) *Handler {
	return &Handler{simulations: simulations}
}

func (h *Handler) List(c *fiber.Ctx) error {
	simulations, err := h.simulations.List(c.Context(), transport.UserID(c))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(simulations)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	simulation, err := simulationFromRequest(transport.UserID(c), "", body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	created, err := h.simulations.Create(c.Context(), simulation)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *Handler) Get(c *fiber.Ctx) error {
	simulation, err := h.simulations.FindByID(c.Context(), transport.UserID(c), c.Params("id"))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(simulation)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	simulation, err := simulationFromRequest(transport.UserID(c), c.Params("id"), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	updated, err := h.simulations.Update(c.Context(), simulation)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(updated)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.simulations.Delete(c.Context(), transport.UserID(c), c.Params("id")); err != nil {
		return transport.RespondError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func simulationFromRequest(userID string, id string, body Request) (Simulation, error) {
	body.Title = strings.TrimSpace(body.Title)
	body.ChannelCode = strings.TrimSpace(body.ChannelCode)
	if body.Title == "" || body.ChannelCode == "" {
		return Simulation{}, core.ErrInvalidInput
	}
	var description *string
	if body.Description != nil {
		trimmedDescription := strings.TrimSpace(*body.Description)
		if trimmedDescription != "" {
			description = &trimmedDescription
		}
	}
	return Simulation{
		ID:          id,
		UserID:      userID,
		ProductID:   body.ProductID,
		Title:       body.Title,
		Description: description,
		ChannelCode: body.ChannelCode,
		Input:       body.Input,
		Result:      body.Result,
	}, nil
}
