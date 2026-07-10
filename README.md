# pricing-hub

Full-stack system for pricing products sold through e-commerce and marketplaces.

The project helps sellers calculate the recommended price, net profit, actual margin, and cost composition by sales channel, considering product cost, taxes, ads, expenses, logistics, manual fees, and marketplace rules.

## Status

- Production environment: https://pricing-hub.vercel.app
- Frontend and backend deployed on Vercel as separate services.
- PostgreSQL database managed through Storage/Database and connected to the project on Vercel.
- Migrations and the initial channel seed are executed automatically during backend startup.

## Features

- Manual registration and login.
- Google OAuth login prepared through environment variables.
- Session with JWT in HttpOnly cookies.
- Toggle between dark and light themes.
- Price calculation by desired margin.
- Analysis of an informed sale price.
- Result with recommended price, total cost, net profit, margin, markup, and cost breakdown.
- Product registration.
- Simulation saving.
- Sales channel selection:
  - Own website
  - Shopee
  - TikTok Shop
  - Mercado Livre Classic
  - Mercado Livre Premium
  - Amazon
  - Temu
  - Shein
  - Other / Manual

## Stack

Backend:

- Go
- Fiber
- PostgreSQL
- SQL migrations
- JWT with HttpOnly cookies
- Manual login with hashed password
- Google OAuth

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- Zod
- Fetch wrapper

Infrastructure:

- Docker Compose for local development
- Vercel for production
- Managed PostgreSQL in production

## Structure

```txt
pricing-hub/
  backend/
    main.go
    internal/
      domain/
      infra/
  frontend/
    src/
      components/
      features/
      services/
      types/
      utils/
      routes/
  docker-compose.yml
  vercel.json
  README.md
```

## Architecture

The backend follows a simple Clean Architecture approach, without creating unnecessary layers.

### Domain

Located in `backend/internal/domain`.

Responsibilities:

- Domain entities.
- Domain types.
- Repository interfaces.
- Pricing rules.
- `PricingService`.

This layer does not depend on Fiber, PostgreSQL, HTTP JSON, or infrastructure details.

### Infra

Located in `backend/internal/infra`.

Responsibilities:

- Configuration through environment variables.
- PostgreSQL connection.
- Migrations.
- Concrete repositories.
- HTTP handlers.
- Middlewares.
- Fiber routes.
- Auth/JWT.
- Google OAuth.
- Initial channel seed.

### Frontend

Located in `frontend/src`.

Main organization:

- `components`: reusable UI components.
- `features`: screens and flows by functional domain.
- `services`: HTTP calls to the backend.
- `types`: shared frontend types.
- `utils`: formatting, conversion, and validations.
- `routes`: protected route configuration.

## Pricing Rule

The financial calculation is centralized in `PricingService`, at:

```txt
backend/internal/domain/pricing_service.go
```

Principles used:

- Money in cents with `int64`.
- Percentages in basis points.
- 4% = `400`.
- 14% = `1400`.
- 20% = `2000`.
- No financial rule is spread across HTTP handlers.
- Channel fees come from the database/seed, not hardcoded in handlers.
- Binary search to find the minimum price when the target is a desired margin.

## Database

The project uses PostgreSQL.

Main tables:

- `users`
- `sessions`
- `user_preferences`
- `marketplace_channels`
- `products`
- `pricing_simulations`

Migrations are located at:

```txt
backend/internal/infra/migrations
```

The initial channel seed is located at:

```txt
backend/internal/infra/seed/channels.json
```

Marketplace fees are editable initial references. They must be checked in the official portals before operational use.

## Environment Variables

### Backend

Local example file:

```txt
backend/.env.example
```

Main variables:

```txt
DATABASE_URL=
FRONTEND_URL=
JWT_ACCESS_SECRET=
ACCESS_TOKEN_TTL_MINUTES=
REFRESH_TOKEN_TTL_HOURS=
COOKIE_SECURE=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=
```

In production, configure on Vercel:

```txt
DATABASE_URL=postgres://...
FRONTEND_URL=https://pricing-hub.vercel.app
JWT_ACCESS_SECRET=a-strong-secret
COOKIE_SECURE=true
```

For Google OAuth:

```txt
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=https://pricing-hub.vercel.app/api/auth/google/callback
```

### Frontend

Local example file:

```txt
frontend/.env.example
```

Optional variable:

```txt
VITE_API_URL=
```

In production, the frontend can use `/api`, because `vercel.json` rewrites requests to the backend.

## Local Development with Docker

```bash
docker compose up --build
```

Local services:

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- PostgreSQL: localhost:5432

Docker Compose starts PostgreSQL only for local development. In production, the database must be a managed PostgreSQL configured on Vercel.

## Local Development without Docker

Backend:

```bash
cd backend
cp .env.example .env
go mod tidy
go run .
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Tests and Build

Backend:

```bash
cd backend
go test ./...
```

Frontend:

```bash
cd frontend
npm run test
npm run lint
npm run build
```

## Deploy

The deployment uses `vercel.json` at the project root.

Main configuration:

- `frontend`: Vite service pointing to `frontend`.
- `backend`: Go service pointing to `backend/main.go`.
- `/api/*`: forwarded to the backend.
- `/*`: forwarded to the frontend.

File:

```txt
vercel.json
```

Before redeploying, confirm that the backend environment variables are configured on Vercel, especially `DATABASE_URL`, `JWT_ACCESS_SECRET`, `FRONTEND_URL`, and `COOKIE_SECURE`.

## Operational Notes

- Vercel does not start the PostgreSQL defined in `docker-compose.yml`.
- `docker-compose.yml` is only for the local environment.
- In production, the backend needs a `DATABASE_URL` pointing to a real PostgreSQL database.
- The backend runs migrations and seed automatically on startup.
- If the backend fails during deploy with a connection error to `127.0.0.1:5432`, it means `DATABASE_URL` was not configured correctly in production.
- When changing environment variables on Vercel, create a new deployment to apply them.
