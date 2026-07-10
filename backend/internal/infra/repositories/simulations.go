package repositories

import (
	"context"
	"encoding/json"

	"pricing-hub/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SimulationRepository struct {
	db *pgxpool.Pool
}

func NewSimulationRepository(db *pgxpool.Pool) *SimulationRepository {
	return &SimulationRepository{db: db}
}

func (r *SimulationRepository) List(ctx context.Context, userID string) ([]domain.Simulation, error) {
	rows, err := r.db.Query(ctx, `
		select id, user_id, product_id, title, description, channel_code, input_json, result_json, created_at
		from pricing_simulations
		where user_id = $1
		order by created_at desc
	`, userID)
	if err != nil {
		return nil, mapDBError(err)
	}
	defer rows.Close()

	simulations := make([]domain.Simulation, 0)
	for rows.Next() {
		simulation, err := scanSimulation(rows.Scan)
		if err != nil {
			return nil, err
		}
		simulations = append(simulations, simulation)
	}
	return simulations, mapDBError(rows.Err())
}

func (r *SimulationRepository) Create(ctx context.Context, simulation domain.Simulation) (domain.Simulation, error) {
	inputJSON, err := json.Marshal(simulation.Input)
	if err != nil {
		return domain.Simulation{}, err
	}
	resultJSON, err := json.Marshal(simulation.Result)
	if err != nil {
		return domain.Simulation{}, err
	}

	created, err := scanSimulation(r.db.QueryRow(ctx, `
		insert into pricing_simulations (user_id, product_id, title, description, channel_code, input_json, result_json)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning id, user_id, product_id, title, description, channel_code, input_json, result_json, created_at
	`, simulation.UserID, simulation.ProductID, simulation.Title, simulation.Description, simulation.ChannelCode, inputJSON, resultJSON).Scan)
	return created, mapDBError(err)
}

func (r *SimulationRepository) FindByID(ctx context.Context, userID string, id string) (domain.Simulation, error) {
	simulation, err := scanSimulation(r.db.QueryRow(ctx, `
		select id, user_id, product_id, title, description, channel_code, input_json, result_json, created_at
		from pricing_simulations
		where user_id = $1 and id = $2
	`, userID, id).Scan)
	return simulation, mapDBError(err)
}

func (r *SimulationRepository) Update(ctx context.Context, simulation domain.Simulation) (domain.Simulation, error) {
	inputJSON, err := json.Marshal(simulation.Input)
	if err != nil {
		return domain.Simulation{}, err
	}
	resultJSON, err := json.Marshal(simulation.Result)
	if err != nil {
		return domain.Simulation{}, err
	}

	updated, err := scanSimulation(r.db.QueryRow(ctx, `
		update pricing_simulations
		set product_id = $3, title = $4, description = $5, channel_code = $6, input_json = $7, result_json = $8
		where user_id = $1 and id = $2
		returning id, user_id, product_id, title, description, channel_code, input_json, result_json, created_at
	`, simulation.UserID, simulation.ID, simulation.ProductID, simulation.Title, simulation.Description, simulation.ChannelCode, inputJSON, resultJSON).Scan)
	return updated, mapDBError(err)
}

func (r *SimulationRepository) Delete(ctx context.Context, userID string, id string) error {
	command, err := r.db.Exec(ctx, `delete from pricing_simulations where user_id = $1 and id = $2`, userID, id)
	if err != nil {
		return mapDBError(err)
	}
	if command.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func scanSimulation(scan scannerFunc) (domain.Simulation, error) {
	var simulation domain.Simulation
	var inputJSON []byte
	var resultJSON []byte
	if err := scan(
		&simulation.ID,
		&simulation.UserID,
		&simulation.ProductID,
		&simulation.Title,
		&simulation.Description,
		&simulation.ChannelCode,
		&inputJSON,
		&resultJSON,
		&simulation.CreatedAt,
	); err != nil {
		return domain.Simulation{}, mapDBError(err)
	}
	if err := json.Unmarshal(inputJSON, &simulation.Input); err != nil {
		return domain.Simulation{}, err
	}
	if err := json.Unmarshal(resultJSON, &simulation.Result); err != nil {
		return domain.Simulation{}, err
	}
	return simulation, nil
}
