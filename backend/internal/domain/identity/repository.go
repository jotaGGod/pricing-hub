package identity

import "context"

type UserRepository interface {
	Create(ctx context.Context, user User) (User, error)
	FindByID(ctx context.Context, id string) (User, error)
	FindByEmail(ctx context.Context, email string) (User, error)
	LinkGoogle(ctx context.Context, userID string, googleID string, avatarURL *string) (User, error)
}

type SessionRepository interface {
	Create(ctx context.Context, session Session) (Session, error)
	FindByRefreshTokenHash(ctx context.Context, hash string) (Session, error)
	Revoke(ctx context.Context, sessionID string) error
}
