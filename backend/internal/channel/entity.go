package channel

import "time"

type FeeStrategy string

const (
	FeeStrategyFixed    FeeStrategy = "fixed"
	FeeStrategyTiered   FeeStrategy = "tiered"
	FeeStrategyCategory FeeStrategy = "category"
)

type Channel struct {
	ID             string
	Code           string
	Name           string
	Description    string
	Enabled        bool
	FeeRules       FeeRules
	LastVerifiedAt *time.Time
	SourceNote     *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type FeeRules struct {
	Strategy             FeeStrategy       `json:"strategy"`
	DefaultCommissionBPS int64             `json:"default_commission_bps"`
	FixedFeeCents        int64             `json:"fixed_fee_cents"`
	MinCommissionCents   int64             `json:"min_commission_cents"`
	ManualAdjustable     bool              `json:"manual_adjustable"`
	Tiers                []FeeTier         `json:"tiers"`
	Categories           []CategoryFeeRule `json:"categories"`
	Options              []FeeOptionRule   `json:"options"`
}

type FeeTier struct {
	MinPriceCents int64  `json:"min_price_cents"`
	MaxPriceCents *int64 `json:"max_price_cents"`
	CommissionBPS int64  `json:"commission_bps"`
	FixedFeeCents int64  `json:"fixed_fee_cents"`
	Label         string `json:"label"`
}

type CategoryFeeRule struct {
	Code          string `json:"code"`
	Name          string `json:"name"`
	CommissionBPS int64  `json:"commission_bps"`
	FixedFeeCents int64  `json:"fixed_fee_cents"`
}

type FeeOptionType string

const (
	FeeOptionPercentage        FeeOptionType = "percentage"
	FeeOptionPercentageWithCap FeeOptionType = "percentage_with_cap"
	FeeOptionFixedAmount       FeeOptionType = "fixed_amount"
)

type FeeOptionRule struct {
	Code             string        `json:"code"`
	Label            string        `json:"label"`
	Type             FeeOptionType `json:"type"`
	BPS              int64         `json:"bps"`
	CapCents         *int64        `json:"cap_cents"`
	FixedAmountCents int64         `json:"fixed_amount_cents"`
	DefaultEnabled   bool          `json:"default_enabled"`
}
