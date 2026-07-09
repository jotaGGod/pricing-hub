package repositories

import (
	"context"

	"pricing-hub/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductRepository struct {
	db *pgxpool.Pool
}

func NewProductRepository(db *pgxpool.Pool) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) List(ctx context.Context, userID string) ([]domain.Product, error) {
	rows, err := r.db.Query(ctx, `
		select id, user_id, title, cost_cents, default_channel_code, category, created_at, updated_at
		from products
		where user_id = $1
		order by created_at desc
	`, userID)
	if err != nil {
		return nil, mapDBError(err)
	}
	defer rows.Close()

	products := make([]domain.Product, 0)
	for rows.Next() {
		var product domain.Product
		if err := rows.Scan(&product.ID, &product.UserID, &product.Title, &product.CostCents, &product.DefaultChannelCode, &product.Category, &product.CreatedAt, &product.UpdatedAt); err != nil {
			return nil, mapDBError(err)
		}
		products = append(products, product)
	}
	return products, mapDBError(rows.Err())
}

func (r *ProductRepository) Create(ctx context.Context, product domain.Product) (domain.Product, error) {
	var created domain.Product
	err := r.db.QueryRow(ctx, `
		insert into products (user_id, title, cost_cents, default_channel_code, category)
		values ($1, $2, $3, $4, $5)
		returning id, user_id, title, cost_cents, default_channel_code, category, created_at, updated_at
	`, product.UserID, product.Title, product.CostCents, product.DefaultChannelCode, product.Category).
		Scan(&created.ID, &created.UserID, &created.Title, &created.CostCents, &created.DefaultChannelCode, &created.Category, &created.CreatedAt, &created.UpdatedAt)
	return created, mapDBError(err)
}

func (r *ProductRepository) FindByID(ctx context.Context, userID string, id string) (domain.Product, error) {
	var product domain.Product
	err := r.db.QueryRow(ctx, `
		select id, user_id, title, cost_cents, default_channel_code, category, created_at, updated_at
		from products
		where user_id = $1 and id = $2
	`, userID, id).Scan(&product.ID, &product.UserID, &product.Title, &product.CostCents, &product.DefaultChannelCode, &product.Category, &product.CreatedAt, &product.UpdatedAt)
	return product, mapDBError(err)
}

func (r *ProductRepository) Update(ctx context.Context, product domain.Product) (domain.Product, error) {
	var updated domain.Product
	err := r.db.QueryRow(ctx, `
		update products
		set title = $3, cost_cents = $4, default_channel_code = $5, category = $6
		where user_id = $1 and id = $2
		returning id, user_id, title, cost_cents, default_channel_code, category, created_at, updated_at
	`, product.UserID, product.ID, product.Title, product.CostCents, product.DefaultChannelCode, product.Category).
		Scan(&updated.ID, &updated.UserID, &updated.Title, &updated.CostCents, &updated.DefaultChannelCode, &updated.Category, &updated.CreatedAt, &updated.UpdatedAt)
	return updated, mapDBError(err)
}

func (r *ProductRepository) Delete(ctx context.Context, userID string, id string) error {
	command, err := r.db.Exec(ctx, `delete from products where user_id = $1 and id = $2`, userID, id)
	if err != nil {
		return mapDBError(err)
	}
	if command.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
