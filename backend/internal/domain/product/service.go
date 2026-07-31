package product

import (
	"context"
	"strings"

	"pricing-hub/backend/internal/domain/shared"
)

type Service struct {
	products Repository
}

func NewService(products Repository) *Service {
	return &Service{products: products}
}

func (s *Service) List(ctx context.Context, userID string) ([]Product, error) {
	return s.products.List(ctx, userID)
}

func (s *Service) Get(ctx context.Context, userID string, id string) (Product, error) {
	return s.products.FindByID(ctx, userID, id)
}

func (s *Service) Create(ctx context.Context, userID string, input Request) (Product, error) {
	product, err := productFromRequest(userID, "", input)
	if err != nil {
		return Product{}, err
	}
	return s.products.Create(ctx, product)
}

func (s *Service) Update(ctx context.Context, userID string, id string, input Request) (Product, error) {
	product, err := productFromRequest(userID, id, input)
	if err != nil {
		return Product{}, err
	}
	return s.products.Update(ctx, product)
}

func (s *Service) Delete(ctx context.Context, userID string, id string) error {
	return s.products.Delete(ctx, userID, id)
}

func productFromRequest(userID string, id string, body Request) (Product, error) {
	body.Title = strings.TrimSpace(body.Title)
	if body.Title == "" || body.CostCents < 0 {
		return Product{}, shared.ErrInvalidInput
	}
	return Product{
		ID:                 id,
		UserID:             userID,
		Title:              body.Title,
		CostCents:          body.CostCents,
		DefaultChannelCode: body.DefaultChannelCode,
		Category:           body.Category,
	}, nil
}
