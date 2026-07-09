package domain

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

type PreferenceRepository interface {
	Get(ctx context.Context, userID string) (UserPreference, error)
	UpsertTheme(ctx context.Context, userID string, theme Theme) (UserPreference, error)
}

type ChannelRepository interface {
	List(ctx context.Context) ([]Channel, error)
	FindByCode(ctx context.Context, code string) (Channel, error)
}

type ProductRepository interface {
	List(ctx context.Context, userID string) ([]Product, error)
	Create(ctx context.Context, product Product) (Product, error)
	FindByID(ctx context.Context, userID string, id string) (Product, error)
	Update(ctx context.Context, product Product) (Product, error)
	Delete(ctx context.Context, userID string, id string) error
}

type SimulationRepository interface {
	List(ctx context.Context, userID string) ([]Simulation, error)
	Create(ctx context.Context, simulation Simulation) (Simulation, error)
	FindByID(ctx context.Context, userID string, id string) (Simulation, error)
	Delete(ctx context.Context, userID string, id string) error
}
