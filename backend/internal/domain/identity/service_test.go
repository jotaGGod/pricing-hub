package identity

import (
	"context"
	"errors"
	"testing"
	"time"

	"pricing-hub/backend/internal/domain/preferences"
	"pricing-hub/backend/internal/domain/shared"
	"pricing-hub/backend/internal/infrastructure/auth"
	"pricing-hub/backend/internal/infrastructure/config"
	googleoauth "pricing-hub/backend/internal/infrastructure/oauth"
)

type fakeUserRepository struct {
	byEmail map[string]User
	nextID  int
}

func newFakeUserRepository() *fakeUserRepository {
	return &fakeUserRepository{byEmail: map[string]User{}}
}

func (f *fakeUserRepository) Create(ctx context.Context, user User) (User, error) {
	f.nextID++
	user.ID = string(rune('a' + f.nextID))
	f.byEmail[user.Email] = user
	return user, nil
}

func (f *fakeUserRepository) FindByID(ctx context.Context, id string) (User, error) {
	for _, user := range f.byEmail {
		if user.ID == id {
			return user, nil
		}
	}
	return User{}, shared.ErrNotFound
}

func (f *fakeUserRepository) FindByEmail(ctx context.Context, email string) (User, error) {
	user, ok := f.byEmail[email]
	if !ok {
		return User{}, shared.ErrNotFound
	}
	return user, nil
}

func (f *fakeUserRepository) LinkGoogle(ctx context.Context, userID string, googleID string, avatarURL *string) (User, error) {
	return User{}, nil
}

type fakeSessionRepository struct{}

func (f *fakeSessionRepository) Create(ctx context.Context, session Session) (Session, error) {
	session.ID = "session-1"
	return session, nil
}

func (f *fakeSessionRepository) FindByRefreshTokenHash(ctx context.Context, hash string) (Session, error) {
	return Session{}, shared.ErrNotFound
}

func (f *fakeSessionRepository) Revoke(ctx context.Context, sessionID string) error {
	return nil
}

type fakePreferenceRepository struct{}

func (f *fakePreferenceRepository) Get(ctx context.Context, userID string) (preferences.UserPreference, error) {
	return preferences.UserPreference{UserID: userID}, nil
}

func (f *fakePreferenceRepository) UpsertTheme(ctx context.Context, userID string, theme preferences.Theme) (preferences.UserPreference, error) {
	return preferences.UserPreference{UserID: userID, Theme: theme}, nil
}

func (f *fakePreferenceRepository) UpsertDefaultCosts(ctx context.Context, userID string, costs preferences.DefaultCosts) (preferences.UserPreference, error) {
	return preferences.UserPreference{UserID: userID, DefaultCosts: costs}, nil
}

func newTestService(users UserRepository) *Service {
	cfg := config.Config{
		JWTAccessSecret: "test-secret",
		AccessTokenTTL:  time.Minute,
		RefreshTokenTTL: time.Hour,
	}
	return NewService(
		cfg,
		users,
		&fakeSessionRepository{},
		&fakePreferenceRepository{},
		auth.NewTokenService(cfg),
		googleoauth.NewGoogleOAuth(cfg),
	)
}

func TestServiceRegisterRejectsShortPassword(t *testing.T) {
	service := newTestService(newFakeUserRepository())
	_, _, err := service.Register(context.Background(), "Jane", "jane@example.com", "123")
	if !errors.Is(err, shared.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceRegisterIssuesSessionOnSuccess(t *testing.T) {
	service := newTestService(newFakeUserRepository())
	user, tokens, err := service.Register(context.Background(), " Jane ", " Jane@Example.com ", "supersecret")
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if user.Email != "jane@example.com" {
		t.Fatalf("expected normalized email, got %q", user.Email)
	}
	if tokens.AccessToken == "" || tokens.RefreshToken == "" {
		t.Fatalf("expected issued tokens, got %+v", tokens)
	}
}

func TestServiceLoginRejectsUnknownEmail(t *testing.T) {
	service := newTestService(newFakeUserRepository())
	_, _, err := service.Login(context.Background(), "missing@example.com", "supersecret")
	if !errors.Is(err, shared.ErrInvalidCredential) {
		t.Fatalf("expected ErrInvalidCredential, got %v", err)
	}
}

func TestServiceLoginRejectsWrongPassword(t *testing.T) {
	users := newFakeUserRepository()
	service := newTestService(users)
	if _, _, err := service.Register(context.Background(), "Jane", "jane@example.com", "supersecret"); err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if _, _, err := service.Login(context.Background(), "jane@example.com", "wrong-password"); !errors.Is(err, shared.ErrInvalidCredential) {
		t.Fatalf("expected ErrInvalidCredential, got %v", err)
	}
}
