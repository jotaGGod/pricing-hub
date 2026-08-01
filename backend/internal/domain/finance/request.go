package finance

type CategoryRequest struct {
	Name        string  `json:"name"`
	Kind        Kind    `json:"kind"`
	Icon        string  `json:"icon"`
	Description *string `json:"description"`
	Active      *bool   `json:"active"`
}

type TransactionRequest struct {
	CategoryID  string  `json:"category_id"`
	AmountCents int64   `json:"amount_cents"`
	Description *string `json:"description"`
	PeriodStart string  `json:"period_start"`
	PeriodEnd   string  `json:"period_end"`
}
