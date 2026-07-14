package channel

import "context"

type Repository interface {
	List(ctx context.Context) ([]Channel, error)
	FindByCode(ctx context.Context, code string) (Channel, error)
}
