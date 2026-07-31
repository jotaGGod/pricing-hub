package preferences

import (
	"time"

	"pricing-hub/backend/internal/pricing"
)

type Theme string

const (
	ThemeDark  Theme = "dark"
	ThemeLight Theme = "light"
)

type DefaultCosts struct {
	TaxBPS            int64                `json:"tax_bps"`
	AdsBPS            int64                `json:"ads_bps"`
	FixedCostsBPS     int64                `json:"fixed_costs_bps"`
	ExtraFeesBPS      int64                `json:"extra_fees_bps"`
	SellerDiscountBPS int64                `json:"seller_discount_bps"`
	LogisticCost      pricing.VariableCost `json:"logistic_cost"`
	ManualCosts       []pricing.ManualCost `json:"manual_costs"`
}

type UserPreference struct {
	UserID       string
	Theme        Theme
	DefaultCosts DefaultCosts
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
