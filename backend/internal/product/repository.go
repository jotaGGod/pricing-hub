package product

import "context"

type Repository interface {
	List(ctx context.Context, userID string) ([]Product, error)
	Create(ctx context.Context, product Product) (Product, error)
	FindByID(ctx context.Context, userID string, id string) (Product, error)
	Update(ctx context.Context, product Product) (Product, error)
	Delete(ctx context.Context, userID string, id string) error
}
