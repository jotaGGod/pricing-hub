package preferences

import "context"

type Repository interface {
	Get(ctx context.Context, userID string) (UserPreference, error)
	UpsertTheme(ctx context.Context, userID string, theme Theme) (UserPreference, error)
	UpsertDefaultCosts(ctx context.Context, userID string, costs DefaultCosts) (UserPreference, error)
}
