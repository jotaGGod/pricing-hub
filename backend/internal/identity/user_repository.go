package identity

import (
	"context"

	"pricing-hub/backend/internal/infra/database"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresUserRepository struct {
	db *pgxpool.Pool
}

func NewPostgresUserRepository(db *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Create(ctx context.Context, user User) (User, error) {
	query := `
		insert into users (name, email, password_hash, google_id, avatar_url)
		values ($1, lower($2), $3, $4, $5)
		returning id, name, email, password_hash, google_id, avatar_url, created_at, updated_at
	`
	var created User
	err := r.db.QueryRow(ctx, query, user.Name, user.Email, user.PasswordHash, user.GoogleID, user.AvatarURL).
		Scan(&created.ID, &created.Name, &created.Email, &created.PasswordHash, &created.GoogleID, &created.AvatarURL, &created.CreatedAt, &created.UpdatedAt)
	return created, database.MapError(err)
}

func (r *PostgresUserRepository) FindByID(ctx context.Context, id string) (User, error) {
	query := `
		select id, name, email, password_hash, google_id, avatar_url, created_at, updated_at
		from users
		where id = $1
	`
	var user User
	err := r.db.QueryRow(ctx, query, id).
		Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.GoogleID, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt)
	return user, database.MapError(err)
}

func (r *PostgresUserRepository) FindByEmail(ctx context.Context, email string) (User, error) {
	query := `
		select id, name, email, password_hash, google_id, avatar_url, created_at, updated_at
		from users
		where email = lower($1)
	`
	var user User
	err := r.db.QueryRow(ctx, query, email).
		Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.GoogleID, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt)
	return user, database.MapError(err)
}

func (r *PostgresUserRepository) LinkGoogle(ctx context.Context, userID string, googleID string, avatarURL *string) (User, error) {
	query := `
		update users
		set google_id = $2, avatar_url = coalesce($3, avatar_url)
		where id = $1
		returning id, name, email, password_hash, google_id, avatar_url, created_at, updated_at
	`
	var user User
	err := r.db.QueryRow(ctx, query, userID, googleID, avatarURL).
		Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.GoogleID, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt)
	return user, database.MapError(err)
}
