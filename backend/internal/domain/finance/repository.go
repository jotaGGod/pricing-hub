package finance

import "context"

type CategoryRepository interface {
	List(ctx context.Context, userID string) ([]Category, error)
	Create(ctx context.Context, category Category) (Category, error)
	FindByID(ctx context.Context, userID string, id string) (Category, error)
	Update(ctx context.Context, category Category) (Category, error)
	Delete(ctx context.Context, userID string, id string) error
	CountByUser(ctx context.Context, userID string) (int, error)
}

type TransactionRepository interface {
	List(ctx context.Context, userID string, period Period) ([]TransactionView, error)
	Create(ctx context.Context, transaction Transaction) (Transaction, error)
	Update(ctx context.Context, transaction Transaction) (Transaction, error)
	Delete(ctx context.Context, userID string, id string) error
	// CountByCategory guards category deletion: a category still in use must not
	// silently take its transactions down with it.
	CountByCategory(ctx context.Context, userID string, categoryID string) (int, error)
	// MonthlyTotals aggregates by the month each transaction's period starts in,
	// for the dashboard's time-series charts.
	MonthlyTotals(ctx context.Context, userID string, period Period) ([]MonthlyPoint, error)
}
