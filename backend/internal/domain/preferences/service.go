package preferences

import (
	"context"

	"pricing-hub/backend/internal/domain/shared"
)

type Service struct {
	preferences Repository
}

func NewService(preferences Repository) *Service {
	return &Service{preferences: preferences}
}

func (s *Service) Get(ctx context.Context, userID string) (UserPreference, error) {
	return s.preferences.Get(ctx, userID)
}

func (s *Service) UpdateTheme(ctx context.Context, userID string, theme Theme) (UserPreference, error) {
	if theme != ThemeDark && theme != ThemeLight {
		return UserPreference{}, shared.ErrInvalidInput
	}
	return s.preferences.UpsertTheme(ctx, userID, theme)
}

func (s *Service) UpdateDefaultCosts(ctx context.Context, userID string, costs DefaultCosts) (UserPreference, error) {
	if err := validateDefaultCosts(costs); err != nil {
		return UserPreference{}, err
	}
	return s.preferences.UpsertDefaultCosts(ctx, userID, costs)
}

func validateDefaultCosts(costs DefaultCosts) error {
	if costs.TaxBPS < 0 || costs.AdsBPS < 0 || costs.FixedCostsBPS < 0 || costs.ExtraFeesBPS < 0 || costs.SellerDiscountBPS < 0 {
		return shared.ErrInvalidInput
	}
	if costs.LogisticCost.AmountCents < 0 || costs.LogisticCost.BPS < 0 {
		return shared.ErrInvalidInput
	}
	for _, cost := range costs.ManualCosts {
		if cost.AmountCents < 0 || cost.BPS < 0 {
			return shared.ErrInvalidInput
		}
	}
	return nil
}
