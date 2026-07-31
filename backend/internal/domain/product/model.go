package product

import "time"

type Product struct {
	ID                 string
	UserID             string
	Title              string
	CostCents          int64
	DefaultChannelCode *string
	Category           *string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
