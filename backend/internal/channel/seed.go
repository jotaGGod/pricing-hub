package channel

import (
	"context"
	"embed"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed channels.json
var channelFiles embed.FS

type channelSeed struct {
	Code           string   `json:"code"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	Enabled        bool     `json:"enabled"`
	FeeRules       FeeRules `json:"fee_rules"`
	LastVerifiedAt *string  `json:"last_verified_at"`
	SourceNote     string   `json:"source_note"`
}

func SeedChannels(ctx context.Context, pool *pgxpool.Pool) error {
	content, err := channelFiles.ReadFile("channels.json")
	if err != nil {
		return err
	}

	var channels []channelSeed
	if err := json.Unmarshal(content, &channels); err != nil {
		return err
	}

	for _, channel := range channels {
		feeRules, err := json.Marshal(channel.FeeRules)
		if err != nil {
			return err
		}
		var lastVerifiedAt *time.Time
		if channel.LastVerifiedAt != nil && *channel.LastVerifiedAt != "" {
			parsed, err := time.Parse("2006-01-02", *channel.LastVerifiedAt)
			if err != nil {
				return err
			}
			lastVerifiedAt = &parsed
		}
		if _, err := pool.Exec(ctx, `
			insert into marketplace_channels (
				code, name, description, enabled, fee_rules_json, last_verified_at, source_note
			)
			values ($1, $2, $3, $4, $5, $6, $7)
			on conflict (code) do nothing
		`, channel.Code, channel.Name, channel.Description, channel.Enabled, feeRules, lastVerifiedAt, channel.SourceNote); err != nil {
			return err
		}
	}
	return nil
}
