package product

import (
	"context"

	"pricing-hub/backend/internal/core"
	"pricing-hub/backend/internal/infra/database"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) List(ctx context.Context, userID string) ([]Product, error) {
	rows, err := r.db.Query(ctx, `
		select id, user_id, title, cost_cents, default_channel_code, category, created_at, updated_at
		from products
		where user_id = $1
		order by created_at desc
	`, userID)
	if err != nil {
		return nil, database.MapError(err)
	}
	defer rows.Close()

	products := make([]Product, 0)
	for rows.Next() {
		var product Product
		if err := rows.Scan(&product.ID, &product.UserID, &product.Title, &product.CostCents, &product.DefaultChannelCode, &product.Category, &product.CreatedAt, &product.UpdatedAt); err != nil {
			return nil, database.MapError(err)
		}
		products = append(products, product)
	}
	return products, database.MapError(rows.Err())
}

func (r *PostgresRepository) Create(ctx context.Context, product Product) (Product, error) {
	var created Product
	err := r.db.QueryRow(ctx, `
		insert into products (user_id, title, cost_cents, default_channel_code, category)
		values ($1, $2, $3, $4, $5)
		returning id, user_id, title, cost_cents, default_channel_code, category, created_at, updated_at
	`, product.UserID, product.Title, product.CostCents, product.DefaultChannelCode, product.Category).
		Scan(&created.ID, &created.UserID, &created.Title, &created.CostCents, &created.DefaultChannelCode, &created.Category, &created.CreatedAt, &created.UpdatedAt)
	return created, database.MapError(err)
}

func (r *PostgresRepository) FindByID(ctx context.Context, userID string, id string) (Product, error) {
	var product Product
	err := r.db.QueryRow(ctx, `
		select id, user_id, title, cost_cents, default_channel_code, category, created_at, updated_at
		from products
		where user_id = $1 and id = $2
	`, userID, id).Scan(&product.ID, &product.UserID, &product.Title, &product.CostCents, &product.DefaultChannelCode, &product.Category, &product.CreatedAt, &product.UpdatedAt)
	return product, database.MapError(err)
}

func (r *PostgresRepository) Update(ctx context.Context, product Product) (Product, error) {
	var updated Product
	err := r.db.QueryRow(ctx, `
		update products
		set title = $3, cost_cents = $4, default_channel_code = $5, category = $6
		where user_id = $1 and id = $2
		returning id, user_id, title, cost_cents, default_channel_code, category, created_at, updated_at
	`, product.UserID, product.ID, product.Title, product.CostCents, product.DefaultChannelCode, product.Category).
		Scan(&updated.ID, &updated.UserID, &updated.Title, &updated.CostCents, &updated.DefaultChannelCode, &updated.Category, &updated.CreatedAt, &updated.UpdatedAt)
	return updated, database.MapError(err)
}

func (r *PostgresRepository) Delete(ctx context.Context, userID string, id string) error {
	command, err := r.db.Exec(ctx, `delete from products where user_id = $1 and id = $2`, userID, id)
	if err != nil {
		return database.MapError(err)
	}
	if command.RowsAffected() == 0 {
		return core.ErrNotFound
	}
	return nil
}
