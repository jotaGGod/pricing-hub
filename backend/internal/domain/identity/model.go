package identity

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
