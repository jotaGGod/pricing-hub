package preferences

import (
	"context"

	"pricing-hub/backend/internal/infra/database"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Get(ctx context.Context, userID string) (UserPreference, error) {
	query := `
		insert into user_preferences (user_id, theme)
		values ($1, 'dark')
		on conflict (user_id) do nothing;
	`
	if _, err := r.db.Exec(ctx, query, userID); err != nil {
		return UserPreference{}, database.MapError(err)
	}

	var preference UserPreference
	err := r.db.QueryRow(ctx, `
		select user_id, theme, created_at, updated_at
		from user_preferences
		where user_id = $1
	`, userID).Scan(&preference.UserID, &preference.Theme, &preference.CreatedAt, &preference.UpdatedAt)
	return preference, database.MapError(err)
}

func (r *PostgresRepository) UpsertTheme(ctx context.Context, userID string, theme Theme) (UserPreference, error) {
	query := `
		insert into user_preferences (user_id, theme)
		values ($1, $2)
		on conflict (user_id) do update set theme = excluded.theme
		returning user_id, theme, created_at, updated_at
	`
	var preference UserPreference
	err := r.db.QueryRow(ctx, query, userID, theme).
		Scan(&preference.UserID, &preference.Theme, &preference.CreatedAt, &preference.UpdatedAt)
	return preference, database.MapError(err)
}
