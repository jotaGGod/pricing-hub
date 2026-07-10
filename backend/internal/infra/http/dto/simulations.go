package dto

import "pricing-hub/backend/internal/domain"

type SimulationRequest struct {
	ProductID   *string              `json:"product_id"`
	Title       string               `json:"title"`
	Description *string              `json:"description"`
	ChannelCode string               `json:"channel_code"`
	Input       domain.PricingInput  `json:"input"`
	Result      domain.PricingResult `json:"result"`
}
