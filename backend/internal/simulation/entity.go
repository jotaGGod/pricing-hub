package simulation

import (
	"time"

	"pricing-hub/backend/internal/pricing"
)

type Simulation struct {
	ID          string
	UserID      string
	ProductID   *string
	Title       string
	Description *string
	ChannelCode string
	Input       pricing.PricingInput
	Result      pricing.PricingResult
	CreatedAt   time.Time
}
