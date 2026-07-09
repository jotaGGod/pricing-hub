package repositories

import (
	"context"
	"encoding/json"

	"pricing-hub/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ChannelRepository struct {
	db *pgxpool.Pool
}

func NewChannelRepository(db *pgxpool.Pool) *ChannelRepository {
	return &ChannelRepository{db: db}
}

func (r *ChannelRepository) List(ctx context.Context) ([]domain.Channel, error) {
	rows, err := r.db.Query(ctx, `
		select id, code, name, description, enabled, fee_rules_json, last_verified_at, source_note, created_at, updated_at
		from marketplace_channels
		where enabled = true
		order by name
	`)
	if err != nil {
		return nil, mapDBError(err)
	}
	defer rows.Close()

	channels := make([]domain.Channel, 0)
	for rows.Next() {
		channel, err := scanChannel(rows.Scan)
		if err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}
	return channels, mapDBError(rows.Err())
}

func (r *ChannelRepository) FindByCode(ctx context.Context, code string) (domain.Channel, error) {
	channel, err := scanChannel(r.db.QueryRow(ctx, `
		select id, code, name, description, enabled, fee_rules_json, last_verified_at, source_note, created_at, updated_at
		from marketplace_channels
		where code = $1 and enabled = true
	`, code).Scan)
	return channel, mapDBError(err)
}

type scannerFunc func(dest ...any) error

func scanChannel(scan scannerFunc) (domain.Channel, error) {
	var channel domain.Channel
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
		return domain.Channel{}, mapDBError(err)
	}
	if err := json.Unmarshal(feeRulesJSON, &channel.FeeRules); err != nil {
		return domain.Channel{}, err
	}
	return channel, nil
}
