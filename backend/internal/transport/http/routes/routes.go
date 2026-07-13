package routes

import (
	"pricing-hub/backend/internal/channel"
	"pricing-hub/backend/internal/identity"
	"pricing-hub/backend/internal/preferences"
	"pricing-hub/backend/internal/pricing"
	"pricing-hub/backend/internal/product"
	"pricing-hub/backend/internal/simulation"

	"github.com/gofiber/fiber/v2"
)

func Register(
	app *fiber.App,
	authMiddleware fiber.Handler,
	authHandler *identity.Handler,
	channelHandler *channel.Handler,
	pricingHandler *pricing.Handler,
	productHandler *product.Handler,
	simulationHandler *simulation.Handler,
	preferenceHandler *preferences.Handler,
) {
	api := app.Group("/api")

	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Get("/google/start", authHandler.GoogleStart)
	auth.Get("/google/callback", authHandler.GoogleCallback)

	api.Get("/channels", channelHandler.List)
	api.Get("/channels/:code", channelHandler.Get)

	protected := api.Group("", authMiddleware)
	protected.Post("/auth/logout", authHandler.Logout)
	protected.Get("/auth/me", authHandler.Me)

	protected.Post("/pricing/calculate", pricingHandler.Calculate)

	protected.Get("/products", productHandler.List)
	protected.Post("/products", productHandler.Create)
	protected.Get("/products/:id", productHandler.Get)
	protected.Put("/products/:id", productHandler.Update)
	protected.Delete("/products/:id", productHandler.Delete)

	protected.Get("/simulations", simulationHandler.List)
	protected.Post("/simulations", simulationHandler.Create)
	protected.Get("/simulations/:id", simulationHandler.Get)
	protected.Put("/simulations/:id", simulationHandler.Update)
	protected.Delete("/simulations/:id", simulationHandler.Delete)

	protected.Get("/preferences", preferenceHandler.Get)
	protected.Put("/preferences/theme", preferenceHandler.UpdateTheme)
}
