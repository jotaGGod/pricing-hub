package simulation

import (
	"context"
	"errors"
	"testing"

	"pricing-hub/backend/internal/domain/pricing"
	"pricing-hub/backend/internal/domain/shared"
)

type fakeRepository struct {
	created Simulation
}

func (f *fakeRepository) List(ctx context.Context, userID string) ([]Simulation, error) {
	return nil, nil
}

func (f *fakeRepository) Create(ctx context.Context, simulation Simulation) (Simulation, error) {
	f.created = simulation
	return simulation, nil
}

func (f *fakeRepository) FindByID(ctx context.Context, userID string, id string) (Simulation, error) {
	return Simulation{}, nil
}

func (f *fakeRepository) Update(ctx context.Context, simulation Simulation) (Simulation, error) {
	return simulation, nil
}

func (f *fakeRepository) Delete(ctx context.Context, userID string, id string) error {
	return nil
}

func baseRequest() Request {
	return Request{
		Title:       "Simulação",
		ChannelCode: "shopee",
		Input:       pricing.PricingInput{},
		Result:      pricing.PricingResult{},
	}
}

func TestServiceCreateRejectsBlankTitle(t *testing.T) {
	service := NewService(&fakeRepository{})
	req := baseRequest()
	req.Title = "   "
	if _, err := service.Create(context.Background(), "user-1", req); !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreateRejectsBlankChannel(t *testing.T) {
	service := NewService(&fakeRepository{})
	req := baseRequest()
	req.ChannelCode = "  "
	if _, err := service.Create(context.Background(), "user-1", req); !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreateNormalizesBlankDescriptionToNil(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	req := baseRequest()
	blank := "   "
	req.Description = &blank
	if _, err := service.Create(context.Background(), "user-1", req); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if repo.created.Description != nil {
		t.Fatalf("expected nil description, got %q", *repo.created.Description)
	}
}
