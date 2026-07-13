package simulation

import (
	"context"
	"encoding/json"

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

func (r *PostgresRepository) List(ctx context.Context, userID string) ([]Simulation, error) {
	rows, err := r.db.Query(ctx, `
		select id, user_id, product_id, title, description, channel_code, input_json, result_json, created_at
		from pricing_simulations
		where user_id = $1
		order by created_at desc
	`, userID)
	if err != nil {
		return nil, database.MapError(err)
	}
	defer rows.Close()

	simulations := make([]Simulation, 0)
	for rows.Next() {
		simulation, err := scanSimulation(rows.Scan)
		if err != nil {
			return nil, err
		}
		simulations = append(simulations, simulation)
	}
	return simulations, database.MapError(rows.Err())
}

func (r *PostgresRepository) Create(ctx context.Context, simulation Simulation) (Simulation, error) {
	inputJSON, err := json.Marshal(simulation.Input)
	if err != nil {
		return Simulation{}, err
	}
	resultJSON, err := json.Marshal(simulation.Result)
	if err != nil {
		return Simulation{}, err
	}

	created, err := scanSimulation(r.db.QueryRow(ctx, `
		insert into pricing_simulations (user_id, product_id, title, description, channel_code, input_json, result_json)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning id, user_id, product_id, title, description, channel_code, input_json, result_json, created_at
	`, simulation.UserID, simulation.ProductID, simulation.Title, simulation.Description, simulation.ChannelCode, inputJSON, resultJSON).Scan)
	return created, database.MapError(err)
}

func (r *PostgresRepository) FindByID(ctx context.Context, userID string, id string) (Simulation, error) {
	simulation, err := scanSimulation(r.db.QueryRow(ctx, `
		select id, user_id, product_id, title, description, channel_code, input_json, result_json, created_at
		from pricing_simulations
		where user_id = $1 and id = $2
	`, userID, id).Scan)
	return simulation, database.MapError(err)
}

func (r *PostgresRepository) Update(ctx context.Context, simulation Simulation) (Simulation, error) {
	inputJSON, err := json.Marshal(simulation.Input)
	if err != nil {
		return Simulation{}, err
	}
	resultJSON, err := json.Marshal(simulation.Result)
	if err != nil {
		return Simulation{}, err
	}

	updated, err := scanSimulation(r.db.QueryRow(ctx, `
		update pricing_simulations
		set product_id = $3, title = $4, description = $5, channel_code = $6, input_json = $7, result_json = $8
		where user_id = $1 and id = $2
		returning id, user_id, product_id, title, description, channel_code, input_json, result_json, created_at
	`, simulation.UserID, simulation.ID, simulation.ProductID, simulation.Title, simulation.Description, simulation.ChannelCode, inputJSON, resultJSON).Scan)
	return updated, database.MapError(err)
}

func (r *PostgresRepository) Delete(ctx context.Context, userID string, id string) error {
	command, err := r.db.Exec(ctx, `delete from pricing_simulations where user_id = $1 and id = $2`, userID, id)
	if err != nil {
		return database.MapError(err)
	}
	if command.RowsAffected() == 0 {
		return core.ErrNotFound
	}
	return nil
}

type scannerFunc func(dest ...any) error

func scanSimulation(scan scannerFunc) (Simulation, error) {
	var simulation Simulation
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
		return Simulation{}, database.MapError(err)
	}
	if err := json.Unmarshal(inputJSON, &simulation.Input); err != nil {
		return Simulation{}, err
	}
	if err := json.Unmarshal(resultJSON, &simulation.Result); err != nil {
		return Simulation{}, err
	}
	return simulation, nil
}
