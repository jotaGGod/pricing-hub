package transport

import (
	"errors"

	"pricing-hub/backend/internal/domain/shared"

	"github.com/gofiber/fiber/v2"
)

func RespondError(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	message := "erro interno"

	switch {
	case errors.Is(err, shared.ErrInvalidInput):
		status = fiber.StatusBadRequest
		message = err.Error()
	case errors.Is(err, shared.ErrUnauthorized), errors.Is(err, shared.ErrInvalidCredential):
		status = fiber.StatusUnauthorized
		message = err.Error()
	case errors.Is(err, shared.ErrNotFound):
		status = fiber.StatusNotFound
		message = err.Error()
	case errors.Is(err, shared.ErrConflict):
		status = fiber.StatusConflict
		message = err.Error()
	case errors.Is(err, shared.ErrImpossibleMargin):
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

func ParseBody[T any](c *fiber.Ctx) (T, error) {
	var body T
	if err := c.BodyParser(&body); err != nil {
		return body, shared.ErrInvalidInput
	}
	return body, nil
}
