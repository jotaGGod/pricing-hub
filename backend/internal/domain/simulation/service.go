package simulation

import (
	"context"
	"strings"

	"pricing-hub/backend/internal/domain/shared"
)

type Service struct {
	simulations Repository
}

func NewService(simulations Repository) *Service {
	return &Service{simulations: simulations}
}

func (s *Service) List(ctx context.Context, userID string) ([]Simulation, error) {
	return s.simulations.List(ctx, userID)
}

func (s *Service) Get(ctx context.Context, userID string, id string) (Simulation, error) {
	return s.simulations.FindByID(ctx, userID, id)
}

func (s *Service) Create(ctx context.Context, userID string, input Request) (Simulation, error) {
	simulation, err := simulationFromRequest(userID, "", input)
	if err != nil {
		return Simulation{}, err
	}
	return s.simulations.Create(ctx, simulation)
}

func (s *Service) Update(ctx context.Context, userID string, id string, input Request) (Simulation, error) {
	simulation, err := simulationFromRequest(userID, id, input)
	if err != nil {
		return Simulation{}, err
	}
	return s.simulations.Update(ctx, simulation)
}

func (s *Service) Delete(ctx context.Context, userID string, id string) error {
	return s.simulations.Delete(ctx, userID, id)
}

func simulationFromRequest(userID string, id string, body Request) (Simulation, error) {
	body.Title = strings.TrimSpace(body.Title)
	body.ChannelCode = strings.TrimSpace(body.ChannelCode)
	if body.Title == "" || body.ChannelCode == "" {
		return Simulation{}, shared.ErrInvalidInput
	}
	var description *string
	if body.Description != nil {
		trimmedDescription := strings.TrimSpace(*body.Description)
		if trimmedDescription != "" {
			description = &trimmedDescription
		}
	}
	return Simulation{
		ID:          id,
		UserID:      userID,
		ProductID:   body.ProductID,
		Title:       body.Title,
		Description: description,
		ChannelCode: body.ChannelCode,
		Input:       body.Input,
		Result:      body.Result,
	}, nil
}
