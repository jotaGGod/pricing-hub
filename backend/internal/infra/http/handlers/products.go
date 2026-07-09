package handlers

import (
	"strings"

	"pricing-hub/backend/internal/domain"
	"pricing-hub/backend/internal/infra/http/dto"
	"pricing-hub/backend/internal/infra/http/middlewares"

	"github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
	products domain.ProductRepository
}

func NewProductHandler(products domain.ProductRepository) *ProductHandler {
	return &ProductHandler{products: products}
}

func (h *ProductHandler) List(c *fiber.Ctx) error {
	products, err := h.products.List(c.Context(), middlewares.UserID(c))
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(products)
}

func (h *ProductHandler) Create(c *fiber.Ctx) error {
	body, err := parseBody[dto.ProductRequest](c)
	if err != nil {
		return respondError(c, err)
	}
	product, err := productFromRequest(middlewares.UserID(c), "", body)
	if err != nil {
		return respondError(c, err)
	}
	created, err := h.products.Create(c.Context(), product)
	if err != nil {
		return respondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *ProductHandler) Get(c *fiber.Ctx) error {
	product, err := h.products.FindByID(c.Context(), middlewares.UserID(c), c.Params("id"))
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(product)
}

func (h *ProductHandler) Update(c *fiber.Ctx) error {
	body, err := parseBody[dto.ProductRequest](c)
	if err != nil {
		return respondError(c, err)
	}
	product, err := productFromRequest(middlewares.UserID(c), c.Params("id"), body)
	if err != nil {
		return respondError(c, err)
	}
	updated, err := h.products.Update(c.Context(), product)
	if err != nil {
		return respondError(c, err)
	}
	return c.JSON(updated)
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
	if err := h.products.Delete(c.Context(), middlewares.UserID(c), c.Params("id")); err != nil {
		return respondError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func productFromRequest(userID string, id string, body dto.ProductRequest) (domain.Product, error) {
	body.Title = strings.TrimSpace(body.Title)
	if body.Title == "" || body.CostCents < 0 {
		return domain.Product{}, domain.ErrInvalidInput
	}
	return domain.Product{
		ID:                 id,
		UserID:             userID,
		Title:              body.Title,
		CostCents:          body.CostCents,
		DefaultChannelCode: body.DefaultChannelCode,
		Category:           body.Category,
	}, nil
}
