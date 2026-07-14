package product

import (
	"strings"

	"pricing-hub/backend/internal/core"
	transport "pricing-hub/backend/internal/transport/http"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	products Repository
}

func NewHandler(products Repository) *Handler {
	return &Handler{products: products}
}

func (h *Handler) List(c *fiber.Ctx) error {
	products, err := h.products.List(c.Context(), transport.UserID(c))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(products)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	product, err := productFromRequest(transport.UserID(c), "", body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	created, err := h.products.Create(c.Context(), product)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *Handler) Get(c *fiber.Ctx) error {
	product, err := h.products.FindByID(c.Context(), transport.UserID(c), c.Params("id"))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(product)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	product, err := productFromRequest(transport.UserID(c), c.Params("id"), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	updated, err := h.products.Update(c.Context(), product)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(updated)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.products.Delete(c.Context(), transport.UserID(c), c.Params("id")); err != nil {
		return transport.RespondError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func productFromRequest(userID string, id string, body Request) (Product, error) {
	body.Title = strings.TrimSpace(body.Title)
	if body.Title == "" || body.CostCents < 0 {
		return Product{}, core.ErrInvalidInput
	}
	return Product{
		ID:                 id,
		UserID:             userID,
		Title:              body.Title,
		CostCents:          body.CostCents,
		DefaultChannelCode: body.DefaultChannelCode,
		Category:           body.Category,
	}, nil
}
