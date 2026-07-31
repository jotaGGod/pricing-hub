package channel

import "context"

type Service struct {
	channels Repository
}

func NewService(channels Repository) *Service {
	return &Service{channels: channels}
}

func (s *Service) List(ctx context.Context) ([]Channel, error) {
	return s.channels.List(ctx)
}

func (s *Service) FindByCode(ctx context.Context, code string) (Channel, error) {
	return s.channels.FindByCode(ctx, code)
}
