package transport

import (
	"pricing-hub/backend/internal/core"
	"pricing-hub/backend/internal/infra/auth"

	"github.com/gofiber/fiber/v2"
)

const (
	UserIDKey    = "userID"
	SessionIDKey = "sessionID"
)

func Auth(tokenService *auth.TokenService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenValue := c.Cookies("access_token")
		if tokenValue == "" {
			return fiber.NewError(fiber.StatusUnauthorized, core.ErrUnauthorized.Error())
		}
		claims, err := tokenService.ParseAccessToken(tokenValue)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, core.ErrUnauthorized.Error())
		}
		c.Locals(UserIDKey, claims.UserID)
		c.Locals(SessionIDKey, claims.SessionID)
		return c.Next()
	}
}

func UserID(c *fiber.Ctx) string {
	value, _ := c.Locals(UserIDKey).(string)
	return value
}

func SessionID(c *fiber.Ctx) string {
	value, _ := c.Locals(SessionIDKey).(string)
	return value
}
