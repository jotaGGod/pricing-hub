package repositories

import (
	"context"

	"pricing-hub/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PreferenceRepository struct {
	db *pgxpool.Pool
}

func NewPreferenceRepository(db *pgxpool.Pool) *PreferenceRepository {
	return &PreferenceRepository{db: db}
}

func (r *PreferenceRepository) Get(ctx context.Context, userID string) (domain.UserPreference, error) {
	query := `
		insert into user_preferences (user_id, theme)
		values ($1, 'dark')
		on conflict (user_id) do nothing;
	`
	if _, err := r.db.Exec(ctx, query, userID); err != nil {
		return domain.UserPreference{}, mapDBError(err)
	}

	var preference domain.UserPreference
	err := r.db.QueryRow(ctx, `
		select user_id, theme, created_at, updated_at
		from user_preferences
		where user_id = $1
	`, userID).Scan(&preference.UserID, &preference.Theme, &preference.CreatedAt, &preference.UpdatedAt)
	return preference, mapDBError(err)
}

func (r *PreferenceRepository) UpsertTheme(ctx context.Context, userID string, theme domain.Theme) (domain.UserPreference, error) {
	query := `
		insert into user_preferences (user_id, theme)
		values ($1, $2)
		on conflict (user_id) do update set theme = excluded.theme
		returning user_id, theme, created_at, updated_at
	`
	var preference domain.UserPreference
	err := r.db.QueryRow(ctx, query, userID, theme).
		Scan(&preference.UserID, &preference.Theme, &preference.CreatedAt, &preference.UpdatedAt)
	return preference, mapDBError(err)
}
