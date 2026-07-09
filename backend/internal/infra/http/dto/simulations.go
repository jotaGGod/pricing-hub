package dto

import "pricing-hub/backend/internal/domain"

type SimulationRequest struct {
	ProductID   *string              `json:"product_id"`
	Title       string               `json:"title"`
	ChannelCode string               `json:"channel_code"`
	Input       domain.PricingInput  `json:"input"`
	Result      domain.PricingResult `json:"result"`
}
