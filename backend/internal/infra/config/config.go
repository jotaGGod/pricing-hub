package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv             string
	Port               string
	DatabaseURL        string
	FrontendURL        string
	JWTAccessSecret    string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	CookieSecure       bool
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
}

func Load() Config {
	return Config{
		AppEnv:             env("APP_ENV", "development"),
		Port:               env("PORT", "8080"),
		DatabaseURL:        env("DATABASE_URL", "postgres://pricing:pricing@localhost:5432/pricing_hub?sslmode=disable"),
		FrontendURL:        env("FRONTEND_URL", "http://localhost:5173"),
		JWTAccessSecret:    env("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
		AccessTokenTTL:     durationMinutes("ACCESS_TOKEN_TTL_MINUTES", 15),
		RefreshTokenTTL:    durationHours("REFRESH_TOKEN_TTL_HOURS", 24*30),
		CookieSecure:       envBool("COOKIE_SECURE", false),
		GoogleClientID:     env("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: env("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  env("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback"),
	}
}

func env(key string, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func durationMinutes(key string, fallback int) time.Duration {
	value, err := strconv.Atoi(env(key, strconv.Itoa(fallback)))
	if err != nil || value <= 0 {
		value = fallback
	}
	return time.Duration(value) * time.Minute
}

func durationHours(key string, fallback int) time.Duration {
	value, err := strconv.Atoi(env(key, strconv.Itoa(fallback)))
	if err != nil || value <= 0 {
		value = fallback
	}
	return time.Duration(value) * time.Hour
}
