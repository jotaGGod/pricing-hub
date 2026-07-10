package domain

import "time"

type Simulation struct {
	ID          string
	UserID      string
	ProductID   *string
	Title       string
	Description *string
	ChannelCode string
	Input       PricingInput
	Result      PricingResult
	CreatedAt   time.Time
}
