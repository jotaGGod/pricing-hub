package identity

import (
	"context"

	"pricing-hub/backend/internal/core"
	"pricing-hub/backend/internal/infra/database"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresSessionRepository struct {
	db *pgxpool.Pool
}

func NewPostgresSessionRepository(db *pgxpool.Pool) *PostgresSessionRepository {
	return &PostgresSessionRepository{db: db}
}

func (r *PostgresSessionRepository) Create(ctx context.Context, session Session) (Session, error) {
	query := `
		insert into sessions (user_id, refresh_token_hash, expires_at)
		values ($1, $2, $3)
		returning id, user_id, refresh_token_hash, expires_at, revoked_at, created_at
	`
	var created Session
	err := r.db.QueryRow(ctx, query, session.UserID, session.RefreshTokenHash, session.ExpiresAt).
		Scan(&created.ID, &created.UserID, &created.RefreshTokenHash, &created.ExpiresAt, &created.RevokedAt, &created.CreatedAt)
	return created, database.MapError(err)
}

func (r *PostgresSessionRepository) FindByRefreshTokenHash(ctx context.Context, hash string) (Session, error) {
	query := `
		select id, user_id, refresh_token_hash, expires_at, revoked_at, created_at
		from sessions
		where refresh_token_hash = $1
	`
	var session Session
	err := r.db.QueryRow(ctx, query, hash).
		Scan(&session.ID, &session.UserID, &session.RefreshTokenHash, &session.ExpiresAt, &session.RevokedAt, &session.CreatedAt)
	return session, database.MapError(err)
}

func (r *PostgresSessionRepository) Revoke(ctx context.Context, sessionID string) error {
	command, err := r.db.Exec(ctx, `update sessions set revoked_at = now() where id = $1 and revoked_at is null`, sessionID)
	if err != nil {
		return database.MapError(err)
	}
	if command.RowsAffected() == 0 {
		return core.ErrNotFound
	}
	return nil
}
