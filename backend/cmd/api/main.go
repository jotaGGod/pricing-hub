package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"pricing-hub/backend/internal/channel"
	"pricing-hub/backend/internal/identity"
	"pricing-hub/backend/internal/infra/auth"
	"pricing-hub/backend/internal/infra/config"
	"pricing-hub/backend/internal/infra/database"
	googleoauth "pricing-hub/backend/internal/infra/oauth"
	"pricing-hub/backend/internal/preferences"
	"pricing-hub/backend/internal/pricing"
	"pricing-hub/backend/internal/product"
	"pricing-hub/backend/internal/simulation"
	transport "pricing-hub/backend/internal/transport/http"
	"pricing-hub/backend/internal/transport/http/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connect: %v", err)
	}
	defer db.Close()

	if err := database.RunMigrations(ctx, db); err != nil {
		log.Fatalf("migrations: %v", err)
	}
	if err := channel.SeedChannels(ctx, db); err != nil {
		log.Fatalf("seed channels: %v", err)
	}

	userRepo := identity.NewPostgresUserRepository(db)
	sessionRepo := identity.NewPostgresSessionRepository(db)
	preferenceRepo := preferences.NewPostgresRepository(db)
	channelRepo := channel.NewPostgresRepository(db)
	productRepo := product.NewPostgresRepository(db)
	simulationRepo := simulation.NewPostgresRepository(db)

	tokenService := auth.NewTokenService(cfg)
	pricingService := pricing.NewPricingService()
	googleOAuth := googleoauth.NewGoogleOAuth(cfg)

	authHandler := identity.NewHandler(cfg, userRepo, sessionRepo, preferenceRepo, tokenService, googleOAuth)
	channelHandler := channel.NewHandler(channelRepo)
	pricingHandler := pricing.NewHandler(channelRepo, pricingService)
	productHandler := product.NewHandler(productRepo)
	simulationHandler := simulation.NewHandler(simulationRepo)
	preferenceHandler := preferences.NewHandler(preferenceRepo)

	app := fiber.New(fiber.Config{
		AppName: "pricing-hub",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			status := fiber.StatusInternalServerError
			message := "erro interno"
			if fiberErr, ok := err.(*fiber.Error); ok {
				status = fiberErr.Code
				message = fiberErr.Message
			}
			return c.Status(status).JSON(fiber.Map{"error": message})
		},
	})
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.TrimRight(cfg.FrontendURL, "/"),
		AllowCredentials: true,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	routes.Register(
		app,
		transport.Auth(tokenService),
		authHandler,
		channelHandler,
		pricingHandler,
		productHandler,
		simulationHandler,
		preferenceHandler,
	)

	go func() {
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Printf("fiber stopped: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
