package preferences

import (
	"context"
	"encoding/json"

	"pricing-hub/backend/internal/infrastructure/database"

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
	var rawCosts []byte
	err := r.db.QueryRow(ctx, `
		select user_id, theme, default_costs_json, created_at, updated_at
		from user_preferences
		where user_id = $1
	`, userID).Scan(&preference.UserID, &preference.Theme, &rawCosts, &preference.CreatedAt, &preference.UpdatedAt)
	if err != nil {
		return UserPreference{}, database.MapError(err)
	}
	if err := json.Unmarshal(rawCosts, &preference.DefaultCosts); err != nil {
		return UserPreference{}, err
	}
	return preference, nil
}

func (r *PostgresRepository) UpsertTheme(ctx context.Context, userID string, theme Theme) (UserPreference, error) {
	query := `
		insert into user_preferences (user_id, theme)
		values ($1, $2)
		on conflict (user_id) do update set theme = excluded.theme
		returning user_id, theme, default_costs_json, created_at, updated_at
	`
	var preference UserPreference
	var rawCosts []byte
	err := r.db.QueryRow(ctx, query, userID, theme).
		Scan(&preference.UserID, &preference.Theme, &rawCosts, &preference.CreatedAt, &preference.UpdatedAt)
	if err != nil {
		return UserPreference{}, database.MapError(err)
	}
	if err := json.Unmarshal(rawCosts, &preference.DefaultCosts); err != nil {
		return UserPreference{}, err
	}
	return preference, nil
}

func (r *PostgresRepository) UpsertDefaultCosts(ctx context.Context, userID string, costs DefaultCosts) (UserPreference, error) {
	costsJSON, err := json.Marshal(costs)
	if err != nil {
		return UserPreference{}, err
	}

	query := `
		insert into user_preferences (user_id, default_costs_json)
		values ($1, $2)
		on conflict (user_id) do update set default_costs_json = excluded.default_costs_json
		returning user_id, theme, default_costs_json, created_at, updated_at
	`
	var preference UserPreference
	var rawCosts []byte
	err = r.db.QueryRow(ctx, query, userID, costsJSON).
		Scan(&preference.UserID, &preference.Theme, &rawCosts, &preference.CreatedAt, &preference.UpdatedAt)
	if err != nil {
		return UserPreference{}, database.MapError(err)
	}
	if err := json.Unmarshal(rawCosts, &preference.DefaultCosts); err != nil {
		return UserPreference{}, err
	}
	return preference, nil
}
