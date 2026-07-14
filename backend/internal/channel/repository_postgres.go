package channel

import (
	"context"
	"encoding/json"

	"pricing-hub/backend/internal/infra/database"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) List(ctx context.Context) ([]Channel, error) {
	rows, err := r.db.Query(ctx, `
		select id, code, name, description, enabled, fee_rules_json, last_verified_at, source_note, created_at, updated_at
		from marketplace_channels
		where enabled = true
		order by name
	`)
	if err != nil {
		return nil, database.MapError(err)
	}
	defer rows.Close()

	channels := make([]Channel, 0)
	for rows.Next() {
		channel, err := scanChannel(rows.Scan)
		if err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}
	return channels, database.MapError(rows.Err())
}

func (r *PostgresRepository) FindByCode(ctx context.Context, code string) (Channel, error) {
	channel, err := scanChannel(r.db.QueryRow(ctx, `
		select id, code, name, description, enabled, fee_rules_json, last_verified_at, source_note, created_at, updated_at
		from marketplace_channels
		where code = $1 and enabled = true
	`, code).Scan)
	return channel, database.MapError(err)
}

type scannerFunc func(dest ...any) error

func scanChannel(scan scannerFunc) (Channel, error) {
	var channel Channel
	var feeRulesJSON []byte
	if err := scan(
		&channel.ID,
		&channel.Code,
		&channel.Name,
		&channel.Description,
		&channel.Enabled,
		&feeRulesJSON,
		&channel.LastVerifiedAt,
		&channel.SourceNote,
		&channel.CreatedAt,
		&channel.UpdatedAt,
	); err != nil {
		return Channel{}, database.MapError(err)
	}
	if err := json.Unmarshal(feeRulesJSON, &channel.FeeRules); err != nil {
		return Channel{}, err
	}
	return channel, nil
}
