package product

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

func (h *Controller) List(c *fiber.Ctx) error {
	products, err := h.service.List(c.Context(), transport.UserID(c))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(products)
}

func (h *Controller) Create(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	created, err := h.service.Create(c.Context(), transport.UserID(c), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *Controller) Get(c *fiber.Ctx) error {
	product, err := h.service.Get(c.Context(), transport.UserID(c), c.Params("id"))
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(product)
}

func (h *Controller) Update(c *fiber.Ctx) error {
	body, err := transport.ParseBody[Request](c)
	if err != nil {
		return transport.RespondError(c, err)
	}
	updated, err := h.service.Update(c.Context(), transport.UserID(c), c.Params("id"), body)
	if err != nil {
		return transport.RespondError(c, err)
	}
	return c.JSON(updated)
}

func (h *Controller) Delete(c *fiber.Ctx) error {
	if err := h.service.Delete(c.Context(), transport.UserID(c), c.Params("id")); err != nil {
		return transport.RespondError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
