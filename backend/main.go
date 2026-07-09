package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"pricing-hub/backend/internal/domain"
	"pricing-hub/backend/internal/infra/auth"
	"pricing-hub/backend/internal/infra/config"
	"pricing-hub/backend/internal/infra/database"
	"pricing-hub/backend/internal/infra/http/handlers"
	"pricing-hub/backend/internal/infra/http/middlewares"
	"pricing-hub/backend/internal/infra/http/routes"
	googleoauth "pricing-hub/backend/internal/infra/oauth"
	"pricing-hub/backend/internal/infra/repositories"
	"pricing-hub/backend/internal/infra/seed"

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
	if err := seed.SeedChannels(ctx, db); err != nil {
		log.Fatalf("seed channels: %v", err)
	}

	userRepo := repositories.NewUserRepository(db)
	sessionRepo := repositories.NewSessionRepository(db)
	preferenceRepo := repositories.NewPreferenceRepository(db)
	channelRepo := repositories.NewChannelRepository(db)
	productRepo := repositories.NewProductRepository(db)
	simulationRepo := repositories.NewSimulationRepository(db)

	tokenService := auth.NewTokenService(cfg)
	pricingService := domain.NewPricingService()
	googleOAuth := googleoauth.NewGoogleOAuth(cfg)

	authHandler := handlers.NewAuthHandler(cfg, userRepo, sessionRepo, preferenceRepo, tokenService, googleOAuth)
	channelHandler := handlers.NewChannelHandler(channelRepo)
	pricingHandler := handlers.NewPricingHandler(channelRepo, pricingService)
	productHandler := handlers.NewProductHandler(productRepo)
	simulationHandler := handlers.NewSimulationHandler(simulationRepo)
	preferenceHandler := handlers.NewPreferenceHandler(preferenceRepo)

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
		middlewares.Auth(tokenService),
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
