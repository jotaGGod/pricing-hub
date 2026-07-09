package repositories

import (
	"context"

	"pricing-hub/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionRepository struct {
	db *pgxpool.Pool
}

func NewSessionRepository(db *pgxpool.Pool) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(ctx context.Context, session domain.Session) (domain.Session, error) {
	query := `
		insert into sessions (user_id, refresh_token_hash, expires_at)
		values ($1, $2, $3)
		returning id, user_id, refresh_token_hash, expires_at, revoked_at, created_at
	`
	var created domain.Session
	err := r.db.QueryRow(ctx, query, session.UserID, session.RefreshTokenHash, session.ExpiresAt).
		Scan(&created.ID, &created.UserID, &created.RefreshTokenHash, &created.ExpiresAt, &created.RevokedAt, &created.CreatedAt)
	return created, mapDBError(err)
}

func (r *SessionRepository) FindByRefreshTokenHash(ctx context.Context, hash string) (domain.Session, error) {
	query := `
		select id, user_id, refresh_token_hash, expires_at, revoked_at, created_at
		from sessions
		where refresh_token_hash = $1
	`
	var session domain.Session
	err := r.db.QueryRow(ctx, query, hash).
		Scan(&session.ID, &session.UserID, &session.RefreshTokenHash, &session.ExpiresAt, &session.RevokedAt, &session.CreatedAt)
	return session, mapDBError(err)
}

func (r *SessionRepository) Revoke(ctx context.Context, sessionID string) error {
	command, err := r.db.Exec(ctx, `update sessions set revoked_at = now() where id = $1 and revoked_at is null`, sessionID)
	if err != nil {
		return mapDBError(err)
	}
	if command.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
