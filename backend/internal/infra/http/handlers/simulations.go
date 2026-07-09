package handlers

import (
	"strings"

	"pricing-hub/backend/internal/domain"
	"pricing-hub/backend/internal/infra/http/dto"
	"pricing-hub/backend/internal/infra/http/middlewares"

	"github.com/gofiber/fiber/v2"
)

type SimulationHandler struct {
	simulations domain.SimulationRepository
}

func NewSimulationHandler(simulations domain.SimulationRepository) *SimulationHandler {
	return &SimulationHandler{simulations: simulations}
}

func (h *SimulationHandler) List(c *fiber.Ctx) error {
	simulations, err := h.simulations.List(c.Context(), middlewares.UserID(c))
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(simulations)
}

func (h *SimulationHandler) Create(c *fiber.Ctx) error {
	body, err := parseBody[dto.SimulationRequest](c)
	if err != nil {
		return respondError(c, err)
	}
	body.Title = strings.TrimSpace(body.Title)
	body.ChannelCode = strings.TrimSpace(body.ChannelCode)
	if body.Title == "" || body.ChannelCode == "" {
		return respondError(c, domain.ErrInvalidInput)
	}
	created, err := h.simulations.Create(c.Context(), domain.Simulation{
		UserID:      middlewares.UserID(c),
		ProductID:   body.ProductID,
		Title:       body.Title,
		ChannelCode: body.ChannelCode,
		Input:       body.Input,
		Result:      body.Result,
	})
	if err != nil {
		return respondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *SimulationHandler) Get(c *fiber.Ctx) error {
	simulation, err := h.simulations.FindByID(c.Context(), middlewares.UserID(c), c.Params("id"))
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(simulation)
}

func (h *SimulationHandler) Delete(c *fiber.Ctx) error {
	if err := h.simulations.Delete(c.Context(), middlewares.UserID(c), c.Params("id")); err != nil {
		return respondError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
