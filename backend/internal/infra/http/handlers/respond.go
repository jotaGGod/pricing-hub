package handlers

import (
	"errors"

	"pricing-hub/backend/internal/domain"

	"github.com/gofiber/fiber/v2"
)

func respondError(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	message := "erro interno"

	switch {
	case errors.Is(err, domain.ErrInvalidInput):
		status = fiber.StatusBadRequest
		message = err.Error()
	case errors.Is(err, domain.ErrUnauthorized), errors.Is(err, domain.ErrInvalidCredential):
		status = fiber.StatusUnauthorized
		message = err.Error()
	case errors.Is(err, domain.ErrNotFound):
		status = fiber.StatusNotFound
		message = err.Error()
	case errors.Is(err, domain.ErrConflict):
		status = fiber.StatusConflict
		message = err.Error()
	case errors.Is(err, domain.ErrImpossibleMargin):
		status = fiber.StatusUnprocessableEntity
		message = err.Error()
	default:
		if fiberErr, ok := err.(*fiber.Error); ok {
			status = fiberErr.Code
			message = fiberErr.Message
		}
	}

	return c.Status(status).JSON(fiber.Map{"error": message})
}

func parseBody[T any](c *fiber.Ctx) (T, error) {
	var body T
	if err := c.BodyParser(&body); err != nil {
		return body, domain.ErrInvalidInput
	}
	return body, nil
}
