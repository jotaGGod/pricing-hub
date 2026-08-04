package identity

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"time"

	"pricing-hub/backend/internal/domain/preferences"
	"pricing-hub/backend/internal/domain/shared"
	"pricing-hub/backend/internal/infrastructure/auth"
	"pricing-hub/backend/internal/infrastructure/config"
	googleoauth "pricing-hub/backend/internal/infrastructure/oauth"
)

type SessionTokens struct {
	AccessToken      string
	AccessExpiresAt  time.Time
	RefreshToken     string
	RefreshExpiresAt time.Time
}

type Service struct {
	cfg          config.Config
	users        UserRepository
	sessions     SessionRepository
	preferences  preferences.Repository
	tokenService *auth.TokenService
	googleOAuth  *googleoauth.GoogleOAuth
}

func NewService(
	cfg config.Config,
	users UserRepository,
	sessions SessionRepository,
	preferences preferences.Repository,
	tokenService *auth.TokenService,
	googleOAuth *googleoauth.GoogleOAuth,
) *Service {
	return &Service{
		cfg:          cfg,
		users:        users,
		sessions:     sessions,
		preferences:  preferences,
		tokenService: tokenService,
		googleOAuth:  googleOAuth,
	}
}

func (s *Service) Register(ctx context.Context, name string, email string, password string) (User, SessionTokens, error) {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(strings.ToLower(email))
	if name == "" || email == "" || len(password) < 6 {
		return User{}, SessionTokens{}, shared.ErrInvalidInput
	}

	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return User{}, SessionTokens{}, err
	}
	user, err := s.users.Create(ctx, User{
		Name:         name,
		Email:        email,
		PasswordHash: &passwordHash,
	})
	if err != nil {
		return User{}, SessionTokens{}, err
	}
	_, _ = s.preferences.Get(ctx, user.ID)

	tokens, err := s.issueSession(ctx, user.ID)
	if err != nil {
		return User{}, SessionTokens{}, err
	}
	return user, tokens, nil
}

func (s *Service) Login(ctx context.Context, email string, password string) (User, SessionTokens, error) {
	user, err := s.users.FindByEmail(ctx, strings.TrimSpace(strings.ToLower(email)))
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return User{}, SessionTokens{}, shared.ErrInvalidCredential
		}
		return User{}, SessionTokens{}, err
	}
	if user.PasswordHash == nil || !auth.ComparePassword(*user.PasswordHash, password) {
		return User{}, SessionTokens{}, shared.ErrInvalidCredential
	}
	tokens, err := s.issueSession(ctx, user.ID)
	if err != nil {
		return User{}, SessionTokens{}, err
	}
	return user, tokens, nil
}

func (s *Service) Logout(ctx context.Context, refreshToken string) {
	if refreshToken == "" {
		return
	}
	session, err := s.sessions.FindByRefreshTokenHash(ctx, auth.HashRefreshToken(refreshToken))
	if err == nil {
		_ = s.sessions.Revoke(ctx, session.ID)
	}
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (string, time.Time, error) {
	if refreshToken == "" {
		return "", time.Time{}, shared.ErrUnauthorized
	}
	session, err := s.sessions.FindByRefreshTokenHash(ctx, auth.HashRefreshToken(refreshToken))
	if err != nil {
		return "", time.Time{}, shared.ErrUnauthorized
	}
	if session.RevokedAt != nil || time.Now().After(session.ExpiresAt) {
		return "", time.Time{}, shared.ErrUnauthorized
	}
	return s.tokenService.IssueAccessToken(session.UserID, session.ID)
}

func (s *Service) Me(ctx context.Context, userID string) (User, error) {
	return s.users.FindByID(ctx, userID)
}

func (s *Service) GoogleAuthURL() (state string, authURL string, err error) {
	state, err = auth.NewStateToken()
	if err != nil {
		return "", "", err
	}
	authURL, err = s.googleOAuth.AuthCodeURL(state)
	if err != nil {
		return "", "", shared.ErrInvalidInput
	}
	return state, authURL, nil
}

func (s *Service) GoogleCallback(ctx context.Context, state string, cookieState string, code string) (User, SessionTokens, error) {
	if state == "" || state != cookieState {
		return User{}, SessionTokens{}, shared.ErrUnauthorized
	}
	googleUser, err := s.googleOAuth.ExchangeUser(ctx, code)
	if err != nil {
		return User{}, SessionTokens{}, err
	}

	avatar := googleUser.Picture
	user, err := s.users.FindByEmail(ctx, googleUser.Email)
	if errors.Is(err, shared.ErrNotFound) {
		user, err = s.users.Create(ctx, User{
			Name:      googleUser.Name,
			Email:     googleUser.Email,
			GoogleID:  &googleUser.ID,
			AvatarURL: &avatar,
		})
	} else if err == nil && (user.GoogleID == nil || *user.GoogleID != googleUser.ID) {
		user, err = s.users.LinkGoogle(ctx, user.ID, googleUser.ID, &avatar)
	}
	if err != nil {
		return User{}, SessionTokens{}, err
	}
	_, _ = s.preferences.Get(ctx, user.ID)

	tokens, err := s.issueSession(ctx, user.ID)
	if err != nil {
		return User{}, SessionTokens{}, err
	}
	return user, tokens, nil
}

// PostLoginRedirectURL is where the browser lands after a successful Google
// OAuth round trip. Falls back to a relative path if FrontendURL is unset or
// malformed, so the redirect never points nowhere.
func (s *Service) PostLoginRedirectURL() string {
	return s.frontendRedirect("/pricing")
}

// LoginErrorRedirectURL is where the browser lands when the Google OAuth
// round trip fails (start or callback). Without this the failure surfaces as
// a raw JSON error in the browser instead of bouncing the user back to the
// login screen with a readable message.
func (s *Service) LoginErrorRedirectURL(reason string) string {
	return s.frontendRedirect("/login?error=" + url.QueryEscape(reason))
}

func (s *Service) frontendRedirect(path string) string {
	redirectTo := strings.TrimRight(s.cfg.FrontendURL, "/") + path
	if _, err := url.Parse(redirectTo); err != nil {
		return path
	}
	return redirectTo
}

func (s *Service) issueSession(ctx context.Context, userID string) (SessionTokens, error) {
	refreshToken, refreshHash, err := auth.NewRefreshToken()
	if err != nil {
		return SessionTokens{}, err
	}
	session, err := s.sessions.Create(ctx, Session{
		UserID:           userID,
		RefreshTokenHash: refreshHash,
		ExpiresAt:        time.Now().Add(s.tokenService.RefreshTTL()),
	})
	if err != nil {
		return SessionTokens{}, err
	}
	accessToken, accessExpiresAt, err := s.tokenService.IssueAccessToken(userID, session.ID)
	if err != nil {
		return SessionTokens{}, err
	}
	return SessionTokens{
		AccessToken:      accessToken,
		AccessExpiresAt:  accessExpiresAt,
		RefreshToken:     refreshToken,
		RefreshExpiresAt: session.ExpiresAt,
	}, nil
}
