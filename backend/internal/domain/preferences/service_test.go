package preferences

import (
	"context"
	"errors"
	"testing"

	"pricing-hub/backend/internal/domain/pricing"
	"pricing-hub/backend/internal/domain/shared"
)

type fakeRepository struct {
	upsertedCosts DefaultCosts
}

func (f *fakeRepository) Get(ctx context.Context, userID string) (UserPreference, error) {
	return UserPreference{UserID: userID, Theme: ThemeDark}, nil
}

func (f *fakeRepository) UpsertTheme(ctx context.Context, userID string, theme Theme) (UserPreference, error) {
	return UserPreference{UserID: userID, Theme: theme}, nil
}

func (f *fakeRepository) UpsertDefaultCosts(ctx context.Context, userID string, costs DefaultCosts) (UserPreference, error) {
	f.upsertedCosts = costs
	return UserPreference{UserID: userID, DefaultCosts: costs}, nil
}

func TestServiceUpdateThemeRejectsUnknownValue(t *testing.T) {
	service := NewService(&fakeRepository{})
	if _, err := service.UpdateTheme(context.Background(), "user-1", Theme("blue")); !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceUpdateDefaultCostsRejectsNegativeBPS(t *testing.T) {
	service := NewService(&fakeRepository{})
	costs := DefaultCosts{TaxBPS: -100}
	if _, err := service.UpdateDefaultCosts(context.Background(), "user-1", costs); !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceUpdateDefaultCostsRejectsNegativeManualCost(t *testing.T) {
	service := NewService(&fakeRepository{})
	costs := DefaultCosts{
		ManualCosts: []pricing.ManualCost{{Name: "Extra", AmountCents: -1}},
	}
	if _, err := service.UpdateDefaultCosts(context.Background(), "user-1", costs); !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceUpdateDefaultCostsAcceptsValidPayload(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	costs := DefaultCosts{TaxBPS: 400}
	if _, err := service.UpdateDefaultCosts(context.Background(), "user-1", costs); err != nil {
		t.Fatalf("UpdateDefaultCosts() error = %v", err)
	}
	if repo.upsertedCosts.TaxBPS != 400 {
		t.Fatalf("expected costs to reach the repository, got %+v", repo.upsertedCosts)
	}
}
