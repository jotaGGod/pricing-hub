package domain

import "time"

type User struct {
	ID           string
	Name         string
	Email        string
	PasswordHash *string
	GoogleID     *string
	AvatarURL    *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Session struct {
	ID               string
	UserID           string
	RefreshTokenHash string
	ExpiresAt        time.Time
	RevokedAt        *time.Time
	CreatedAt        time.Time
}

type Theme string

const (
	ThemeDark  Theme = "dark"
	ThemeLight Theme = "light"
)

type UserPreference struct {
	UserID    string
	Theme     Theme
	CreatedAt time.Time
	UpdatedAt time.Time
}
