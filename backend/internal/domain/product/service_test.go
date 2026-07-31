package product

import (
	"context"
	"errors"
	"testing"

	"pricing-hub/backend/internal/domain/shared"
)

type fakeRepository struct {
	created Product
}

func (f *fakeRepository) List(ctx context.Context, userID string) ([]Product, error) {
	return nil, nil
}

func (f *fakeRepository) Create(ctx context.Context, product Product) (Product, error) {
	f.created = product
	return product, nil
}

func (f *fakeRepository) FindByID(ctx context.Context, userID string, id string) (Product, error) {
	return Product{}, nil
}

func (f *fakeRepository) Update(ctx context.Context, product Product) (Product, error) {
	return product, nil
}

func (f *fakeRepository) Delete(ctx context.Context, userID string, id string) error {
	return nil
}

func TestServiceCreateRejectsBlankTitle(t *testing.T) {
	service := NewService(&fakeRepository{})
	_, err := service.Create(context.Background(), "user-1", Request{Title: "   ", CostCents: 100})
	if !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreateRejectsNegativeCost(t *testing.T) {
	service := NewService(&fakeRepository{})
	_, err := service.Create(context.Background(), "user-1", Request{Title: "Produto", CostCents: -1})
	if !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreateTrimsTitle(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	if _, err := service.Create(context.Background(), "user-1", Request{Title: "  Produto  ", CostCents: 100}); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if repo.created.Title != "Produto" {
		t.Fatalf("expected trimmed title, got %q", repo.created.Title)
	}
	if repo.created.UserID != "user-1" {
		t.Fatalf("expected user id to be set, got %q", repo.created.UserID)
	}
}
