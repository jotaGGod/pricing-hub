# pricing-hub

Sistema full-stack para precificacao de produtos vendidos em e-commerce e marketplaces.

## Stack

- Backend: Go, Fiber, PostgreSQL, migrations SQL, JWT em cookies HttpOnly, login manual e Google OAuth.
- Frontend: React, TypeScript, Vite, Tailwind CSS, Zod e fetch wrapper.
- Monorepo: `backend` e `frontend` separados diretamente na raiz do projeto.

## Rodando local com Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- PostgreSQL: localhost:5432

O backend aplica migrations e seed de canais ao iniciar.

## Rodando sem Docker

Backend:

```bash
cd backend
cp .env.example .env
go mod tidy
go run ./cmd/api
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Variaveis de ambiente

Backend:

- `DATABASE_URL`
- `FRONTEND_URL`
- `JWT_ACCESS_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URL`
- `COOKIE_SECURE`

Frontend:

- `VITE_API_URL`

## Testes e build

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

## Migrations

As migrations ficam em `backend/internal/infra/migrations` e sao aplicadas automaticamente pelo backend usando a tabela `schema_migrations`.

## Taxas de marketplace

As taxas iniciais ficam em `backend/internal/infra/seed/channels.json` e sao inseridas no banco em `marketplace_channels`. Elas sao seeds editaveis e nao devem ser tratadas como definitivas. Antes de uso operacional, confirme com os portais oficiais de cada marketplace.
