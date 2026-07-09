package domain

type PricingMode string

const (
	PricingModeTargetMargin     PricingMode = "target_margin"
	PricingModeAnalyzeSalePrice PricingMode = "analyze_sale_price"
)

type CostType string

const (
	CostTypeFixedAmount CostType = "fixed_amount"
	CostTypePercentage  CostType = "percentage"
)

type ManualCost struct {
	Name        string   `json:"name"`
	Type        CostType `json:"type"`
	AmountCents int64    `json:"amount_cents"`
	BPS         int64    `json:"bps"`
	Enabled     bool     `json:"enabled"`
}

type VariableCost struct {
	Type        CostType `json:"type"`
	AmountCents int64    `json:"amount_cents"`
	BPS         int64    `json:"bps"`
}

type ChannelOptions struct {
	CategoryCode          string          `json:"category_code"`
	OverrideCommissionBPS *int64          `json:"override_commission_bps"`
	OverrideFixedFeeCents *int64          `json:"override_fixed_fee_cents"`
	EnabledOptionCodes    map[string]bool `json:"enabled_options"`
}

type PricingInput struct {
	ProductTitle      string         `json:"product_title"`
	ProductCostCents  int64          `json:"product_cost_cents"`
	SalePriceCents    *int64         `json:"sale_price_cents"`
	DesiredMarginBPS  *int64         `json:"desired_margin_bps"`
	SellerDiscountBPS int64          `json:"seller_discount_bps"`
	ChannelCode       string         `json:"channel_code"`
	ChannelOptions    ChannelOptions `json:"channel_options"`
	ManualCosts       []ManualCost   `json:"manual_costs"`
	AdsBPS            int64          `json:"ads_bps"`
	FixedCostsBPS     int64          `json:"fixed_costs_bps"`
	TaxBPS            int64          `json:"tax_bps"`
	ExtraFeesBPS      int64          `json:"extra_fees_bps"`
	LogisticCost      *VariableCost  `json:"logistic_cost"`
	Mode              PricingMode    `json:"mode"`
}

type PricingStatus string

const (
	PricingStatusProfit  PricingStatus = "profit"
	PricingStatusWarning PricingStatus = "warning"
	PricingStatusLoss    PricingStatus = "loss"
)

type PricingBreakdownItem struct {
	Label       string `json:"label"`
	AmountCents int64  `json:"amount_cents"`
	BPS         *int64 `json:"bps"`
}

type PricingResult struct {
	SalePriceCents            int64                  `json:"sale_price_cents"`
	RecommendedSalePriceCents int64                  `json:"recommended_sale_price_cents"`
	TotalCostCents            int64                  `json:"total_cost_cents"`
	ProductCostCents          int64                  `json:"product_cost_cents"`
	ManualCostsTotalCents     int64                  `json:"manual_costs_total_cents"`
	ChannelFeeCents           int64                  `json:"channel_fee_cents"`
	ChannelCommissionCents    int64                  `json:"channel_commission_cents"`
	ChannelFixedFeeCents      int64                  `json:"channel_fixed_fee_cents"`
	TaxCents                  int64                  `json:"tax_cents"`
	AdsCents                  int64                  `json:"ads_cents"`
	ExtraFeesCents            int64                  `json:"extra_fees_cents"`
	NetProfitCents            int64                  `json:"net_profit_cents"`
	MarginBPS                 int64                  `json:"margin_bps"`
	MarkupBPS                 int64                  `json:"markup_bps"`
	Status                    PricingStatus          `json:"status"`
	Breakdown                 []PricingBreakdownItem `json:"breakdown"`
}
