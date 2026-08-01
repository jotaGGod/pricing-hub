package finance

import "time"

// Kind separates money coming in from money going out. Every category and every
// transaction carries it, so the DRE can be built without guessing by name.
type Kind string

const (
	KindIncome  Kind = "income"
	KindExpense Kind = "expense"
)

func (k Kind) Valid() bool {
	return k == KindIncome || k == KindExpense
}

type Category struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Kind        Kind      `json:"kind"`
	Icon        string    `json:"icon"`
	Description *string   `json:"description"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Transaction struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	CategoryID  string    `json:"category_id"`
	Kind        Kind      `json:"kind"`
	AmountCents int64     `json:"amount_cents"`
	Description *string   `json:"description"`
	PeriodStart time.Time `json:"period_start"`
	PeriodEnd   time.Time `json:"period_end"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TransactionView is a Transaction enriched with its category's display data,
// so the frontend list doesn't have to join client-side.
type TransactionView struct {
	Transaction
	CategoryName string `json:"category_name"`
	CategoryIcon string `json:"category_icon"`
}

// Period is an inclusive date range. Both ends are dates (no time component):
// the user thinks in "june 2025", not in timestamps.
type Period struct {
	Start time.Time
	End   time.Time
}

// MonthlyPoint is one bucket of the dashboard's time series. Transactions are
// grouped by the month their period starts in, which matches how the user logs
// them ("june totals").
type MonthlyPoint struct {
	Month          string `json:"month"`
	RevenueCents   int64  `json:"revenue_cents"`
	ExpenseCents   int64  `json:"expense_cents"`
	NetProfitCents int64  `json:"net_profit_cents"`
	MarginBPS      int64  `json:"margin_bps"`
}

type SummaryLine struct {
	CategoryID     string `json:"category_id"`
	CategoryName   string `json:"category_name"`
	CategoryIcon   string `json:"category_icon"`
	AmountCents    int64  `json:"amount_cents"`
	ShareOfRevenue int64  `json:"share_of_revenue_bps"`
	ChangeBPS      *int64 `json:"change_bps"`
}

// Summary is the whole dashboard payload: KPIs, cost composition and the DRE
// lines, already compared against the immediately preceding period of the same
// length.
type Summary struct {
	PeriodStart time.Time `json:"period_start"`
	PeriodEnd   time.Time `json:"period_end"`

	RevenueCents         int64 `json:"revenue_cents"`
	ExpenseCents         int64 `json:"expense_cents"`
	NetProfitCents       int64 `json:"net_profit_cents"`
	MarginBPS            int64 `json:"margin_bps"`
	ExpenseShareOfRevBPS int64 `json:"expense_share_of_revenue_bps"`

	RevenueChangeBPS   *int64 `json:"revenue_change_bps"`
	ExpenseChangeBPS   *int64 `json:"expense_change_bps"`
	NetProfitChangeBPS *int64 `json:"net_profit_change_bps"`
	MarginChangeBPS    *int64 `json:"margin_change_bps"`

	IncomeLines  []SummaryLine `json:"income_lines"`
	ExpenseLines []SummaryLine `json:"expense_lines"`
}
