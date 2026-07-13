package simulation

import "pricing-hub/backend/internal/pricing"

type Request struct {
	ProductID   *string               `json:"product_id"`
	Title       string                `json:"title"`
	Description *string               `json:"description"`
	ChannelCode string                `json:"channel_code"`
	Input       pricing.PricingInput  `json:"input"`
	Result      pricing.PricingResult `json:"result"`
}
