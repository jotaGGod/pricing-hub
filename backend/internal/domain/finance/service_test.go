package finance

import (
	"context"
	"errors"
	"testing"
	"time"

	"pricing-hub/backend/internal/domain/shared"
)

type fakeCategoryRepository struct {
	categories map[string]Category
	created    []Category
}

func newFakeCategoryRepository() *fakeCategoryRepository {
	return &fakeCategoryRepository{categories: map[string]Category{}}
}

func (f *fakeCategoryRepository) List(ctx context.Context, userID string) ([]Category, error) {
	result := make([]Category, 0, len(f.categories))
	for _, category := range f.categories {
		result = append(result, category)
	}
	return result, nil
}

func (f *fakeCategoryRepository) Create(ctx context.Context, category Category) (Category, error) {
	if category.ID == "" {
		category.ID = category.Name
	}
	f.categories[category.ID] = category
	f.created = append(f.created, category)
	return category, nil
}

func (f *fakeCategoryRepository) FindByID(ctx context.Context, userID string, id string) (Category, error) {
	category, ok := f.categories[id]
	if !ok {
		return Category{}, shared.ErrNotFound
	}
	return category, nil
}

func (f *fakeCategoryRepository) Update(ctx context.Context, category Category) (Category, error) {
	f.categories[category.ID] = category
	return category, nil
}

func (f *fakeCategoryRepository) Delete(ctx context.Context, userID string, id string) error {
	delete(f.categories, id)
	return nil
}

func (f *fakeCategoryRepository) CountByUser(ctx context.Context, userID string) (int, error) {
	return len(f.categories), nil
}

type fakeTransactionRepository struct {
	created      Transaction
	byCategory   map[string]int
	currentBatch []TransactionView
	priorBatch   []TransactionView
	calls        int
	series       []MonthlyPoint
	seriesWindow Period
}

func (f *fakeTransactionRepository) List(ctx context.Context, userID string, period Period) ([]TransactionView, error) {
	f.calls++
	if f.calls == 1 {
		return f.currentBatch, nil
	}
	return f.priorBatch, nil
}

func (f *fakeTransactionRepository) Create(ctx context.Context, transaction Transaction) (Transaction, error) {
	f.created = transaction
	return transaction, nil
}

func (f *fakeTransactionRepository) Update(ctx context.Context, transaction Transaction) (Transaction, error) {
	return transaction, nil
}

func (f *fakeTransactionRepository) Delete(ctx context.Context, userID string, id string) error {
	return nil
}

func (f *fakeTransactionRepository) CountByCategory(ctx context.Context, userID string, categoryID string) (int, error) {
	if f.byCategory == nil {
		return 0, nil
	}
	return f.byCategory[categoryID], nil
}

func (f *fakeTransactionRepository) MonthlyTotals(ctx context.Context, userID string, period Period) ([]MonthlyPoint, error) {
	f.seriesWindow = period
	return f.series, nil
}

func view(categoryID string, kind Kind, amount int64) TransactionView {
	return TransactionView{
		Transaction:  Transaction{CategoryID: categoryID, Kind: kind, AmountCents: amount},
		CategoryName: categoryID,
	}
}

func TestListCategoriesSeedsDefaultsOnlyOnce(t *testing.T) {
	categories := newFakeCategoryRepository()
	service := NewService(categories, &fakeTransactionRepository{})

	first, err := service.ListCategories(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("ListCategories() error = %v", err)
	}
	if len(first) != len(defaultCategories) {
		t.Fatalf("expected %d seeded categories, got %d", len(defaultCategories), len(first))
	}

	categories.created = nil
	if _, err := service.ListCategories(context.Background(), "user-1"); err != nil {
		t.Fatalf("ListCategories() error = %v", err)
	}
	if len(categories.created) != 0 {
		t.Fatalf("expected no re-seed, got %d new categories", len(categories.created))
	}
}

func TestCreateCategoryRejectsInvalidKind(t *testing.T) {
	service := NewService(newFakeCategoryRepository(), &fakeTransactionRepository{})
	_, err := service.CreateCategory(context.Background(), "user-1", CategoryRequest{Name: "Teste", Kind: Kind("both")})
	if !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestCreateCategoryRejectsBlankName(t *testing.T) {
	service := NewService(newFakeCategoryRepository(), &fakeTransactionRepository{})
	_, err := service.CreateCategory(context.Background(), "user-1", CategoryRequest{Name: "   ", Kind: KindExpense})
	if !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestDeleteCategoryRefusesWhenInUse(t *testing.T) {
	categories := newFakeCategoryRepository()
	categories.categories["cat-1"] = Category{ID: "cat-1", Kind: KindExpense}
	transactions := &fakeTransactionRepository{byCategory: map[string]int{"cat-1": 3}}
	service := NewService(categories, transactions)

	if err := service.DeleteCategory(context.Background(), "user-1", "cat-1"); !errors.Is(err, shared.ErrConflict) {
		t.Fatalf("expected ErrConflict, got %v", err)
	}
	if _, still := categories.categories["cat-1"]; !still {
		t.Fatal("category should not have been deleted")
	}
}

func TestCreateTransactionDerivesKindFromCategory(t *testing.T) {
	categories := newFakeCategoryRepository()
	categories.categories["cat-1"] = Category{ID: "cat-1", Kind: KindExpense, Name: "Impostos"}
	transactions := &fakeTransactionRepository{}
	service := NewService(categories, transactions)

	created, err := service.CreateTransaction(context.Background(), "user-1", TransactionRequest{
		CategoryID:  "cat-1",
		AmountCents: 5000,
		PeriodStart: "2026-06-01",
		PeriodEnd:   "2026-06-30",
	})
	if err != nil {
		t.Fatalf("CreateTransaction() error = %v", err)
	}
	if created.Kind != KindExpense {
		t.Fatalf("expected kind derived from category, got %q", created.Kind)
	}
}

func TestCreateTransactionRejectsInvalidPeriod(t *testing.T) {
	categories := newFakeCategoryRepository()
	categories.categories["cat-1"] = Category{ID: "cat-1", Kind: KindExpense}
	service := NewService(categories, &fakeTransactionRepository{})

	_, err := service.CreateTransaction(context.Background(), "user-1", TransactionRequest{
		CategoryID:  "cat-1",
		AmountCents: 100,
		PeriodStart: "2026-06-30",
		PeriodEnd:   "2026-06-01",
	})
	if !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestCreateTransactionRejectsNegativeAmount(t *testing.T) {
	categories := newFakeCategoryRepository()
	categories.categories["cat-1"] = Category{ID: "cat-1", Kind: KindExpense}
	service := NewService(categories, &fakeTransactionRepository{})

	_, err := service.CreateTransaction(context.Background(), "user-1", TransactionRequest{
		CategoryID:  "cat-1",
		AmountCents: -1,
		PeriodStart: "2026-06-01",
		PeriodEnd:   "2026-06-30",
	})
	if !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestSummaryComputesProfitAndMargin(t *testing.T) {
	transactions := &fakeTransactionRepository{
		currentBatch: []TransactionView{
			view("revenue", KindIncome, 100_000),
			view("tax", KindExpense, 20_000),
			view("ads", KindExpense, 5_000),
		},
	}
	service := NewService(newFakeCategoryRepository(), transactions)

	summary, err := service.Summary(context.Background(), "user-1", "2026-06-01", "2026-06-30")
	if err != nil {
		t.Fatalf("Summary() error = %v", err)
	}
	if summary.RevenueCents != 100_000 || summary.ExpenseCents != 25_000 {
		t.Fatalf("unexpected totals: %+v", summary)
	}
	if summary.NetProfitCents != 75_000 {
		t.Fatalf("expected profit 75000, got %d", summary.NetProfitCents)
	}
	if summary.MarginBPS != 7500 {
		t.Fatalf("expected margin 7500 bps, got %d", summary.MarginBPS)
	}
	// Expense lines are ordered biggest first.
	if len(summary.ExpenseLines) != 2 || summary.ExpenseLines[0].CategoryID != "tax" {
		t.Fatalf("unexpected expense lines: %+v", summary.ExpenseLines)
	}
	if summary.ExpenseLines[0].ShareOfRevenue != 2000 {
		t.Fatalf("expected tax share 2000 bps, got %d", summary.ExpenseLines[0].ShareOfRevenue)
	}
}

func TestSummaryComparesAgainstPreviousPeriod(t *testing.T) {
	transactions := &fakeTransactionRepository{
		currentBatch: []TransactionView{view("revenue", KindIncome, 120_000)},
		priorBatch:   []TransactionView{view("revenue", KindIncome, 100_000)},
	}
	service := NewService(newFakeCategoryRepository(), transactions)

	summary, err := service.Summary(context.Background(), "user-1", "2026-06-01", "2026-06-30")
	if err != nil {
		t.Fatalf("Summary() error = %v", err)
	}
	if summary.RevenueChangeBPS == nil || *summary.RevenueChangeBPS != 2000 {
		t.Fatalf("expected +2000 bps (20%%) revenue change, got %v", summary.RevenueChangeBPS)
	}
}

func TestSummaryOmitsChangeWithoutBaseline(t *testing.T) {
	transactions := &fakeTransactionRepository{
		currentBatch: []TransactionView{view("revenue", KindIncome, 120_000)},
	}
	service := NewService(newFakeCategoryRepository(), transactions)

	summary, err := service.Summary(context.Background(), "user-1", "2026-06-01", "2026-06-30")
	if err != nil {
		t.Fatalf("Summary() error = %v", err)
	}
	if summary.RevenueChangeBPS != nil {
		t.Fatalf("expected nil change without baseline, got %v", *summary.RevenueChangeBPS)
	}
}

func TestSummaryRejectsInvalidPeriod(t *testing.T) {
	service := NewService(newFakeCategoryRepository(), &fakeTransactionRepository{})
	if _, err := service.Summary(context.Background(), "user-1", "junho", "2026-06-30"); !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestSeriesLooksBackSixMonths(t *testing.T) {
	transactions := &fakeTransactionRepository{}
	service := NewService(newFakeCategoryRepository(), transactions)

	if _, err := service.Series(context.Background(), "user-1", "2026-06-01", "2026-06-30"); err != nil {
		t.Fatalf("Series() error = %v", err)
	}
	// June is the last of six buckets, so the window opens on the 1st of January.
	if got := transactions.seriesWindow.Start.Format(dateLayout); got != "2026-01-01" {
		t.Fatalf("expected series window to start 2026-01-01, got %s", got)
	}
}

func TestPrecedingPeriodMirrorsLength(t *testing.T) {
	start := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC)

	previous := precedingPeriod(Period{Start: start, End: end})

	if !previous.End.Equal(time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("expected previous period to end 2026-05-31, got %s", previous.End.Format(dateLayout))
	}
	if !previous.Start.Equal(time.Date(2026, 5, 2, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("expected 30-day window starting 2026-05-02, got %s", previous.Start.Format(dateLayout))
	}
}
