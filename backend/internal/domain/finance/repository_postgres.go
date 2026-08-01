package finance

import (
	"context"

	"pricing-hub/backend/internal/domain/shared"
	"pricing-hub/backend/internal/infrastructure/database"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresCategoryRepository struct {
	db *pgxpool.Pool
}

func NewPostgresCategoryRepository(db *pgxpool.Pool) *PostgresCategoryRepository {
	return &PostgresCategoryRepository{db: db}
}

const categoryColumns = `id, user_id, name, kind, icon, description, active, created_at, updated_at`

func (r *PostgresCategoryRepository) List(ctx context.Context, userID string) ([]Category, error) {
	rows, err := r.db.Query(ctx, `
		select `+categoryColumns+`
		from finance_categories
		where user_id = $1
		order by kind, name
	`, userID)
	if err != nil {
		return nil, database.MapError(err)
	}
	defer rows.Close()

	categories := make([]Category, 0)
	for rows.Next() {
		category, err := scanCategory(rows.Scan)
		if err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}
	return categories, database.MapError(rows.Err())
}

func (r *PostgresCategoryRepository) Create(ctx context.Context, category Category) (Category, error) {
	created, err := scanCategory(r.db.QueryRow(ctx, `
		insert into finance_categories (user_id, name, kind, icon, description, active)
		values ($1, $2, $3, $4, $5, $6)
		returning `+categoryColumns+`
	`, category.UserID, category.Name, category.Kind, category.Icon, category.Description, category.Active).Scan)
	return created, database.MapError(err)
}

func (r *PostgresCategoryRepository) FindByID(ctx context.Context, userID string, id string) (Category, error) {
	category, err := scanCategory(r.db.QueryRow(ctx, `
		select `+categoryColumns+`
		from finance_categories
		where user_id = $1 and id = $2
	`, userID, id).Scan)
	return category, database.MapError(err)
}

func (r *PostgresCategoryRepository) Update(ctx context.Context, category Category) (Category, error) {
	updated, err := scanCategory(r.db.QueryRow(ctx, `
		update finance_categories
		set name = $3, kind = $4, icon = $5, description = $6, active = $7
		where user_id = $1 and id = $2
		returning `+categoryColumns+`
	`, category.UserID, category.ID, category.Name, category.Kind, category.Icon, category.Description, category.Active).Scan)
	return updated, database.MapError(err)
}

func (r *PostgresCategoryRepository) Delete(ctx context.Context, userID string, id string) error {
	command, err := r.db.Exec(ctx, `delete from finance_categories where user_id = $1 and id = $2`, userID, id)
	if err != nil {
		return database.MapError(err)
	}
	if command.RowsAffected() == 0 {
		return shared.ErrNotFound
	}
	return nil
}

func (r *PostgresCategoryRepository) CountByUser(ctx context.Context, userID string) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `select count(*) from finance_categories where user_id = $1`, userID).Scan(&total)
	return total, database.MapError(err)
}

type PostgresTransactionRepository struct {
	db *pgxpool.Pool
}

func NewPostgresTransactionRepository(db *pgxpool.Pool) *PostgresTransactionRepository {
	return &PostgresTransactionRepository{db: db}
}

const transactionColumns = `t.id, t.user_id, t.category_id, t.kind, t.amount_cents, t.description,
	t.period_start, t.period_end, t.created_at, t.updated_at`

// List returns every transaction whose period overlaps the requested window.
// Overlap (not containment) is intentional: a user who logs "june" totals still
// wants to see them when browsing a quarter that includes june.
func (r *PostgresTransactionRepository) List(ctx context.Context, userID string, period Period) ([]TransactionView, error) {
	rows, err := r.db.Query(ctx, `
		select `+transactionColumns+`, c.name, c.icon
		from finance_transactions t
		join finance_categories c on c.id = t.category_id
		where t.user_id = $1 and t.period_start <= $3 and t.period_end >= $2
		order by t.created_at desc
	`, userID, period.Start, period.End)
	if err != nil {
		return nil, database.MapError(err)
	}
	defer rows.Close()

	transactions := make([]TransactionView, 0)
	for rows.Next() {
		var view TransactionView
		if err := rows.Scan(
			&view.ID,
			&view.UserID,
			&view.CategoryID,
			&view.Kind,
			&view.AmountCents,
			&view.Description,
			&view.PeriodStart,
			&view.PeriodEnd,
			&view.CreatedAt,
			&view.UpdatedAt,
			&view.CategoryName,
			&view.CategoryIcon,
		); err != nil {
			return nil, database.MapError(err)
		}
		transactions = append(transactions, view)
	}
	return transactions, database.MapError(rows.Err())
}

func (r *PostgresTransactionRepository) Create(ctx context.Context, transaction Transaction) (Transaction, error) {
	created, err := scanTransaction(r.db.QueryRow(ctx, `
		insert into finance_transactions (user_id, category_id, kind, amount_cents, description, period_start, period_end)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning id, user_id, category_id, kind, amount_cents, description, period_start, period_end, created_at, updated_at
	`, transaction.UserID, transaction.CategoryID, transaction.Kind, transaction.AmountCents,
		transaction.Description, transaction.PeriodStart, transaction.PeriodEnd).Scan)
	return created, database.MapError(err)
}

func (r *PostgresTransactionRepository) Update(ctx context.Context, transaction Transaction) (Transaction, error) {
	updated, err := scanTransaction(r.db.QueryRow(ctx, `
		update finance_transactions
		set category_id = $3, kind = $4, amount_cents = $5, description = $6, period_start = $7, period_end = $8
		where user_id = $1 and id = $2
		returning id, user_id, category_id, kind, amount_cents, description, period_start, period_end, created_at, updated_at
	`, transaction.UserID, transaction.ID, transaction.CategoryID, transaction.Kind, transaction.AmountCents,
		transaction.Description, transaction.PeriodStart, transaction.PeriodEnd).Scan)
	return updated, database.MapError(err)
}

func (r *PostgresTransactionRepository) Delete(ctx context.Context, userID string, id string) error {
	command, err := r.db.Exec(ctx, `delete from finance_transactions where user_id = $1 and id = $2`, userID, id)
	if err != nil {
		return database.MapError(err)
	}
	if command.RowsAffected() == 0 {
		return shared.ErrNotFound
	}
	return nil
}

func (r *PostgresTransactionRepository) MonthlyTotals(ctx context.Context, userID string, period Period) ([]MonthlyPoint, error) {
	rows, err := r.db.Query(ctx, `
		select
			to_char(date_trunc('month', period_start), 'YYYY-MM') as month,
			coalesce(sum(amount_cents) filter (where kind = 'income'), 0) as revenue,
			coalesce(sum(amount_cents) filter (where kind = 'expense'), 0) as expense
		from finance_transactions
		where user_id = $1 and period_start >= $2 and period_start <= $3
		group by 1
		order by 1
	`, userID, period.Start, period.End)
	if err != nil {
		return nil, database.MapError(err)
	}
	defer rows.Close()

	points := make([]MonthlyPoint, 0)
	for rows.Next() {
		var point MonthlyPoint
		if err := rows.Scan(&point.Month, &point.RevenueCents, &point.ExpenseCents); err != nil {
			return nil, database.MapError(err)
		}
		point.NetProfitCents = point.RevenueCents - point.ExpenseCents
		point.MarginBPS = marginBPS(point.NetProfitCents, point.RevenueCents)
		points = append(points, point)
	}
	return points, database.MapError(rows.Err())
}

func (r *PostgresTransactionRepository) CountByCategory(ctx context.Context, userID string, categoryID string) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		select count(*) from finance_transactions where user_id = $1 and category_id = $2
	`, userID, categoryID).Scan(&total)
	return total, database.MapError(err)
}

type scannerFunc func(dest ...any) error

func scanCategory(scan scannerFunc) (Category, error) {
	var category Category
	if err := scan(
		&category.ID,
		&category.UserID,
		&category.Name,
		&category.Kind,
		&category.Icon,
		&category.Description,
		&category.Active,
		&category.CreatedAt,
		&category.UpdatedAt,
	); err != nil {
		return Category{}, database.MapError(err)
	}
	return category, nil
}

func scanTransaction(scan scannerFunc) (Transaction, error) {
	var transaction Transaction
	if err := scan(
		&transaction.ID,
		&transaction.UserID,
		&transaction.CategoryID,
		&transaction.Kind,
		&transaction.AmountCents,
		&transaction.Description,
		&transaction.PeriodStart,
		&transaction.PeriodEnd,
		&transaction.CreatedAt,
		&transaction.UpdatedAt,
	); err != nil {
		return Transaction{}, database.MapError(err)
	}
	return transaction, nil
}
