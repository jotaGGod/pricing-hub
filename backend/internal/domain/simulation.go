package domain

import "time"

type Simulation struct {
	ID          string
	UserID      string
	ProductID   *string
	Title       string
	ChannelCode string
	Input       PricingInput
	Result      PricingResult
	CreatedAt   time.Time
}
