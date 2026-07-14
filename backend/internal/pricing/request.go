package pricing

type Request struct {
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
	TaxBPS            *int64         `json:"tax_bps"`
	ExtraFeesBPS      int64          `json:"extra_fees_bps"`
	LogisticCost      *VariableCost  `json:"logistic_cost"`
	Mode              Mode           `json:"mode"`
}

func (r Request) ToInput() PricingInput {
	taxBPS := int64(400)
	if r.TaxBPS != nil {
		taxBPS = *r.TaxBPS
	}
	return PricingInput{
		ProductTitle:      r.ProductTitle,
		ProductCostCents:  r.ProductCostCents,
		SalePriceCents:    r.SalePriceCents,
		DesiredMarginBPS:  r.DesiredMarginBPS,
		SellerDiscountBPS: r.SellerDiscountBPS,
		ChannelCode:       r.ChannelCode,
		ChannelOptions:    r.ChannelOptions,
		ManualCosts:       r.ManualCosts,
		AdsBPS:            r.AdsBPS,
		FixedCostsBPS:     r.FixedCostsBPS,
		TaxBPS:            taxBPS,
		ExtraFeesBPS:      r.ExtraFeesBPS,
		LogisticCost:      r.LogisticCost,
		Mode:              r.Mode,
	}
}
