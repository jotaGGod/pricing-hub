package oauth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"pricing-hub/backend/internal/infra/config"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleUser struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Picture  string `json:"picture"`
	Verified bool   `json:"verified_email"`
}

type GoogleOAuth struct {
	config *oauth2.Config
	ready  bool
}

func NewGoogleOAuth(cfg config.Config) *GoogleOAuth {
	ready := cfg.GoogleClientID != "" && cfg.GoogleClientSecret != ""
	return &GoogleOAuth{
		ready: ready,
		config: &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  cfg.GoogleRedirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		},
	}
}

func (g *GoogleOAuth) AuthCodeURL(state string) (string, error) {
	if !g.ready {
		return "", errors.New("google oauth nao configurado")
	}
	return g.config.AuthCodeURL(state, oauth2.AccessTypeOffline), nil
}

func (g *GoogleOAuth) ExchangeUser(ctx context.Context, code string) (GoogleUser, error) {
	if !g.ready {
		return GoogleUser{}, errors.New("google oauth nao configurado")
	}
	token, err := g.config.Exchange(ctx, code)
	if err != nil {
		return GoogleUser{}, err
	}

	client := g.config.Client(ctx, token)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return GoogleUser{}, err
	}
	response, err := client.Do(request)
	if err != nil {
		return GoogleUser{}, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return GoogleUser{}, errors.New("falha ao buscar usuario do google")
	}

	var user GoogleUser
	if err := json.NewDecoder(response.Body).Decode(&user); err != nil {
		return GoogleUser{}, err
	}
	if user.Email == "" || user.ID == "" {
		return GoogleUser{}, errors.New("perfil google incompleto")
	}
	return user, nil
}
