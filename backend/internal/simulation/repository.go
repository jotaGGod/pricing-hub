package simulation

import "context"

type Repository interface {
	List(ctx context.Context, userID string) ([]Simulation, error)
	Create(ctx context.Context, simulation Simulation) (Simulation, error)
	FindByID(ctx context.Context, userID string, id string) (Simulation, error)
	Update(ctx context.Context, simulation Simulation) (Simulation, error)
	Delete(ctx context.Context, userID string, id string) error
}
