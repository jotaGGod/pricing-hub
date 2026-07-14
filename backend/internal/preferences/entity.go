package preferences

import "time"

type Theme string

const (
	ThemeDark  Theme = "dark"
	ThemeLight Theme = "light"
)

type UserPreference struct {
	UserID    string
	Theme     Theme
	CreatedAt time.Time
	UpdatedAt time.Time
}
