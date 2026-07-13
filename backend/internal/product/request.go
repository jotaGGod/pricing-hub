package product

type Request struct {
	Title              string  `json:"title"`
	CostCents          int64   `json:"cost_cents"`
	DefaultChannelCode *string `json:"default_channel_code"`
	Category           *string `json:"category"`
}
