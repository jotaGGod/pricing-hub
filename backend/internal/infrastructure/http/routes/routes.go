package routes

import (
	"pricing-hub/backend/internal/domain/channel"
	"pricing-hub/backend/internal/domain/finance"
	"pricing-hub/backend/internal/domain/identity"
	"pricing-hub/backend/internal/domain/preferences"
	"pricing-hub/backend/internal/domain/pricing"
	"pricing-hub/backend/internal/domain/product"
	"pricing-hub/backend/internal/domain/simulation"

	"github.com/gofiber/fiber/v2"
)

func Register(
	app *fiber.App,
	authMiddleware fiber.Handler,
	authHandler *identity.Controller,
	channelHandler *channel.Controller,
	pricingHandler *pricing.Controller,
	productHandler *product.Controller,
	simulationHandler *simulation.Controller,
	preferenceHandler *preferences.Controller,
	financeHandler *finance.Controller,
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
	protected.Put("/preferences/default-costs", preferenceHandler.UpdateDefaultCosts)

	protected.Get("/finance/categories", financeHandler.ListCategories)
	protected.Post("/finance/categories", financeHandler.CreateCategory)
	protected.Put("/finance/categories/:id", financeHandler.UpdateCategory)
	protected.Delete("/finance/categories/:id", financeHandler.DeleteCategory)

	protected.Get("/finance/transactions", financeHandler.ListTransactions)
	protected.Post("/finance/transactions", financeHandler.CreateTransaction)
	protected.Put("/finance/transactions/:id", financeHandler.UpdateTransaction)
	protected.Delete("/finance/transactions/:id", financeHandler.DeleteTransaction)

	protected.Get("/finance/summary", financeHandler.Summary)
	protected.Get("/finance/series", financeHandler.Series)
}
