package finance

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

func (h *Controller) ListCategories(c *fiber.Ctx) error {
	categories, err := h.service.ListCategories(c.Context(), transport.UserID(c))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(categories)
}

func (h *Controller) CreateCategory(c *fiber.Ctx) error {
	body, err := transport.ParseBody[CategoryRequest](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	created, err := h.service.CreateCategory(c.Context(), transport.UserID(c), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *Controller) UpdateCategory(c *fiber.Ctx) error {
	body, err := transport.ParseBody[CategoryRequest](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	updated, err := h.service.UpdateCategory(c.Context(), transport.UserID(c), c.Params("id"), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(updated)
}

func (h *Controller) DeleteCategory(c *fiber.Ctx) error {
	if err := h.service.DeleteCategory(c.Context(), transport.UserID(c), c.Params("id")); err != nil {
		return transport.RespondError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Controller) ListTransactions(c *fiber.Ctx) error {
	transactions, err := h.service.ListTransactions(
		c.Context(),
		transport.UserID(c),
		c.Query("period_start"),
		c.Query("period_end"),
	)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(transactions)
}

func (h *Controller) CreateTransaction(c *fiber.Ctx) error {
	body, err := transport.ParseBody[TransactionRequest](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	created, err := h.service.CreateTransaction(c.Context(), transport.UserID(c), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *Controller) UpdateTransaction(c *fiber.Ctx) error {
	body, err := transport.ParseBody[TransactionRequest](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	updated, err := h.service.UpdateTransaction(c.Context(), transport.UserID(c), c.Params("id"), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(updated)
}

func (h *Controller) DeleteTransaction(c *fiber.Ctx) error {
	if err := h.service.DeleteTransaction(c.Context(), transport.UserID(c), c.Params("id")); err != nil {
		return transport.RespondError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Controller) Series(c *fiber.Ctx) error {
	series, err := h.service.Series(
		c.Context(),
		transport.UserID(c),
		c.Query("period_start"),
		c.Query("period_end"),
	)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(series)
}

func (h *Controller) Summary(c *fiber.Ctx) error {
	summary, err := h.service.Summary(
		c.Context(),
		transport.UserID(c),
		c.Query("period_start"),
		c.Query("period_end"),
	)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(summary)
}
