package finance

import (
	"context"
	"strings"
	"time"

	"pricing-hub/backend/internal/domain/shared"
)

const (
	bpsBase       int64 = 10000
	dateLayout          = "2006-01-02"
	maxNameLength       = 80
	maxDescLength       = 180
)

// defaultCategories bootstrap a new user's chart of accounts with the buckets a
// marketplace seller actually uses. They are ordinary categories once created —
// fully editable and deletable.
var defaultCategories = []Category{
	{Name: "Faturamento", Kind: KindIncome, Icon: "shopping-cart", Active: true},
	{Name: "Outras Receitas", Kind: KindIncome, Icon: "circle-plus", Active: true},
	{Name: "Taxas Shopee", Kind: KindExpense, Icon: "briefcase", Active: true},
	{Name: "Comissões Shopee", Kind: KindExpense, Icon: "percent", Active: true},
	{Name: "Cupons do Vendedor", Kind: KindExpense, Icon: "ticket", Active: true},
	{Name: "Descontos de PIX", Kind: KindExpense, Icon: "gem", Active: true},
	{Name: "Impostos", Kind: KindExpense, Icon: "landmark", Active: true},
	{Name: "Embalagens", Kind: KindExpense, Icon: "package", Active: true},
	{Name: "Gráfica", Kind: KindExpense, Icon: "printer", Active: true},
	{Name: "Frete", Kind: KindExpense, Icon: "truck", Active: true},
	{Name: "Marketing (Ads)", Kind: KindExpense, Icon: "megaphone", Active: true},
	{Name: "Outras Despesas", Kind: KindExpense, Icon: "file-text", Active: true},
}

type Service struct {
	categories   CategoryRepository
	transactions TransactionRepository
}

func NewService(categories CategoryRepository, transactions TransactionRepository) *Service {
	return &Service{categories: categories, transactions: transactions}
}

// ListCategories seeds the default chart of accounts the first time a user opens
// the finance module, so the screen is never empty on day one.
func (s *Service) ListCategories(ctx context.Context, userID string) ([]Category, error) {
	total, err := s.categories.CountByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if total == 0 {
		for _, category := range defaultCategories {
			category.UserID = userID
			if _, err := s.categories.Create(ctx, category); err != nil {
				return nil, err
			}
		}
	}
	return s.categories.List(ctx, userID)
}

func (s *Service) CreateCategory(ctx context.Context, userID string, input CategoryRequest) (Category, error) {
	category, err := categoryFromRequest(userID, "", input)
	if err != nil {
		return Category{}, err
	}
	return s.categories.Create(ctx, category)
}

func (s *Service) UpdateCategory(ctx context.Context, userID string, id string, input CategoryRequest) (Category, error) {
	category, err := categoryFromRequest(userID, id, input)
	if err != nil {
		return Category{}, err
	}
	return s.categories.Update(ctx, category)
}

// DeleteCategory refuses to remove a category that still has transactions —
// deleting it would either orphan or silently destroy financial history.
func (s *Service) DeleteCategory(ctx context.Context, userID string, id string) error {
	used, err := s.transactions.CountByCategory(ctx, userID, id)
	if err != nil {
		return err
	}
	if used > 0 {
		return shared.ErrConflict
	}
	return s.categories.Delete(ctx, userID, id)
}

func (s *Service) ListTransactions(ctx context.Context, userID string, startRaw string, endRaw string) ([]TransactionView, error) {
	period, err := parsePeriod(startRaw, endRaw)
	if err != nil {
		return nil, err
	}
	return s.transactions.List(ctx, userID, period)
}

func (s *Service) CreateTransaction(ctx context.Context, userID string, input TransactionRequest) (Transaction, error) {
	transaction, err := s.transactionFromRequest(ctx, userID, "", input)
	if err != nil {
		return Transaction{}, err
	}
	return s.transactions.Create(ctx, transaction)
}

func (s *Service) UpdateTransaction(ctx context.Context, userID string, id string, input TransactionRequest) (Transaction, error) {
	transaction, err := s.transactionFromRequest(ctx, userID, id, input)
	if err != nil {
		return Transaction{}, err
	}
	return s.transactions.Update(ctx, transaction)
}

func (s *Service) DeleteTransaction(ctx context.Context, userID string, id string) error {
	return s.transactions.Delete(ctx, userID, id)
}

// Summary builds the dashboard/DRE for a period and compares it against the
// immediately preceding window of the same length.
func (s *Service) Summary(ctx context.Context, userID string, startRaw string, endRaw string) (Summary, error) {
	period, err := parsePeriod(startRaw, endRaw)
	if err != nil {
		return Summary{}, err
	}

	current, err := s.transactions.List(ctx, userID, period)
	if err != nil {
		return Summary{}, err
	}
	previous, err := s.transactions.List(ctx, userID, precedingPeriod(period))
	if err != nil {
		return Summary{}, err
	}

	return buildSummary(period, current, previous), nil
}

// seriesMonths is how far back the dashboard charts look, counting the selected
// period's own month as the last bucket.
const seriesMonths = 6

// Series returns the monthly evolution ending on the selected period's month,
// so the dashboard can plot profit and margin over time.
func (s *Service) Series(ctx context.Context, userID string, startRaw string, endRaw string) ([]MonthlyPoint, error) {
	period, err := parsePeriod(startRaw, endRaw)
	if err != nil {
		return nil, err
	}
	windowStart := time.Date(period.End.Year(), period.End.Month(), 1, 0, 0, 0, 0, period.End.Location()).
		AddDate(0, -(seriesMonths - 1), 0)
	return s.transactions.MonthlyTotals(ctx, userID, Period{Start: windowStart, End: period.End})
}

func buildSummary(period Period, current []TransactionView, previous []TransactionView) Summary {
	currentRevenue, currentExpense := totals(current)
	previousRevenue, previousExpense := totals(previous)

	currentProfit := currentRevenue - currentExpense
	previousProfit := previousRevenue - previousExpense
	currentMargin := marginBPS(currentProfit, currentRevenue)
	previousMargin := marginBPS(previousProfit, previousRevenue)

	previousByCategory := sumByCategory(previous)

	summary := Summary{
		PeriodStart:          period.Start,
		PeriodEnd:            period.End,
		RevenueCents:         currentRevenue,
		ExpenseCents:         currentExpense,
		NetProfitCents:       currentProfit,
		MarginBPS:            currentMargin,
		ExpenseShareOfRevBPS: marginBPS(currentExpense, currentRevenue),
		RevenueChangeBPS:     changeBPS(currentRevenue, previousRevenue),
		ExpenseChangeBPS:     changeBPS(currentExpense, previousExpense),
		NetProfitChangeBPS:   changeBPS(currentProfit, previousProfit),
		IncomeLines:          make([]SummaryLine, 0),
		ExpenseLines:         make([]SummaryLine, 0),
	}

	// Margin moves in percentage points, not percent-of-percent, so it is a
	// plain difference rather than a ratio like the other deltas.
	if len(previous) > 0 {
		marginDelta := currentMargin - previousMargin
		summary.MarginChangeBPS = &marginDelta
	}

	for _, line := range aggregate(current, KindIncome, currentRevenue, previousByCategory) {
		summary.IncomeLines = append(summary.IncomeLines, line)
	}
	for _, line := range aggregate(current, KindExpense, currentRevenue, previousByCategory) {
		summary.ExpenseLines = append(summary.ExpenseLines, line)
	}
	return summary
}

func totals(transactions []TransactionView) (revenue int64, expense int64) {
	for _, transaction := range transactions {
		if transaction.Kind == KindIncome {
			revenue += transaction.AmountCents
			continue
		}
		expense += transaction.AmountCents
	}
	return revenue, expense
}

func sumByCategory(transactions []TransactionView) map[string]int64 {
	totals := make(map[string]int64)
	for _, transaction := range transactions {
		totals[transaction.CategoryID] += transaction.AmountCents
	}
	return totals
}

// aggregate collapses transactions into one line per category, preserving the
// order categories first appear so the DRE stays stable between reloads.
func aggregate(transactions []TransactionView, kind Kind, revenue int64, previousByCategory map[string]int64) []SummaryLine {
	order := make([]string, 0)
	lines := make(map[string]*SummaryLine)

	for _, transaction := range transactions {
		if transaction.Kind != kind {
			continue
		}
		line, ok := lines[transaction.CategoryID]
		if !ok {
			order = append(order, transaction.CategoryID)
			lines[transaction.CategoryID] = &SummaryLine{
				CategoryID:   transaction.CategoryID,
				CategoryName: transaction.CategoryName,
				CategoryIcon: transaction.CategoryIcon,
			}
			line = lines[transaction.CategoryID]
		}
		line.AmountCents += transaction.AmountCents
	}

	result := make([]SummaryLine, 0, len(order))
	for _, categoryID := range order {
		line := lines[categoryID]
		line.ShareOfRevenue = marginBPS(line.AmountCents, revenue)
		if previousAmount, ok := previousByCategory[categoryID]; ok {
			line.ChangeBPS = changeBPS(line.AmountCents, previousAmount)
		}
		result = append(result, *line)
	}

	// Biggest lines first — that's the order a DRE is read in.
	for i := 1; i < len(result); i++ {
		for j := i; j > 0 && result[j].AmountCents > result[j-1].AmountCents; j-- {
			result[j], result[j-1] = result[j-1], result[j]
		}
	}
	return result
}

func marginBPS(part int64, whole int64) int64 {
	if whole <= 0 {
		return 0
	}
	return part * bpsBase / whole
}

// changeBPS is the relative variation against the previous period. It returns
// nil when there is no baseline, because "infinite growth" is not a number the
// UI can honestly show.
func changeBPS(current int64, previous int64) *int64 {
	if previous == 0 {
		return nil
	}
	base := previous
	if base < 0 {
		base = -base
	}
	change := (current - previous) * bpsBase / base
	return &change
}

// precedingPeriod is the window of the same length ending the day before the
// current one starts.
func precedingPeriod(period Period) Period {
	days := int(period.End.Sub(period.Start).Hours()/24) + 1
	end := period.Start.AddDate(0, 0, -1)
	return Period{
		Start: end.AddDate(0, 0, -(days - 1)),
		End:   end,
	}
}

func parsePeriod(startRaw string, endRaw string) (Period, error) {
	start, err := time.Parse(dateLayout, strings.TrimSpace(startRaw))
	if err != nil {
		return Period{}, shared.ErrInvalidInput
	}
	end, err := time.Parse(dateLayout, strings.TrimSpace(endRaw))
	if err != nil {
		return Period{}, shared.ErrInvalidInput
	}
	if end.Before(start) {
		return Period{}, shared.ErrInvalidInput
	}
	return Period{Start: start, End: end}, nil
}

func categoryFromRequest(userID string, id string, body CategoryRequest) (Category, error) {
	name := strings.TrimSpace(body.Name)
	icon := strings.TrimSpace(body.Icon)
	if name == "" || len(name) > maxNameLength || !body.Kind.Valid() {
		return Category{}, shared.ErrInvalidInput
	}
	if icon == "" {
		icon = "circle-dollar-sign"
	}

	active := true
	if body.Active != nil {
		active = *body.Active
	}

	return Category{
		ID:          id,
		UserID:      userID,
		Name:        name,
		Kind:        body.Kind,
		Icon:        icon,
		Description: trimOptional(body.Description),
		Active:      active,
	}, nil
}

// transactionFromRequest takes the kind from the chosen category instead of
// trusting the client: a transaction whose kind disagrees with its category
// would corrupt every total on the dashboard.
func (s *Service) transactionFromRequest(ctx context.Context, userID string, id string, body TransactionRequest) (Transaction, error) {
	categoryID := strings.TrimSpace(body.CategoryID)
	if categoryID == "" || body.AmountCents < 0 {
		return Transaction{}, shared.ErrInvalidInput
	}
	period, err := parsePeriod(body.PeriodStart, body.PeriodEnd)
	if err != nil {
		return Transaction{}, err
	}
	category, err := s.categories.FindByID(ctx, userID, categoryID)
	if err != nil {
		return Transaction{}, err
	}

	return Transaction{
		ID:          id,
		UserID:      userID,
		CategoryID:  category.ID,
		Kind:        category.Kind,
		AmountCents: body.AmountCents,
		Description: trimOptional(body.Description),
		PeriodStart: period.Start,
		PeriodEnd:   period.End,
	}, nil
}

func trimOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	if len(trimmed) > maxDescLength {
		trimmed = trimmed[:maxDescLength]
	}
	return &trimmed
}
