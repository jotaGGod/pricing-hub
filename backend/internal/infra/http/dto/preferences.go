package dto

import "pricing-hub/backend/internal/domain"

type ThemeRequest struct {
	Theme domain.Theme `json:"theme"`
}
