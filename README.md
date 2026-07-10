# pricing-hub

Sistema full-stack para precificacao de produtos vendidos em e-commerce e marketplaces.

O projeto ajuda vendedores a calcular preco recomendado, lucro liquido, margem real e composicao de custos por canal de venda, considerando custo do produto, impostos, ads, despesas, logistica, taxas manuais e regras de marketplace.

## Status

- Ambiente de producao: https://pricing-hub.vercel.app
- Frontend e backend publicados na Vercel como servicos separados.
- Banco de dados em PostgreSQL gerenciado via Storage/Database conectado ao projeto na Vercel.
- Migrations e seed inicial de canais sao executados automaticamente no startup do backend.

## Funcionalidades

- Cadastro e login manual.
- Login com Google OAuth preparado por variaveis de ambiente.
- Sessao com JWT em cookies HttpOnly.
- Alternancia entre tema escuro e claro.
- Calculo de preco por margem desejada.
- Analise de preco de venda informado.
- Resultado com preco recomendado, custo total, lucro liquido, margem, markup e breakdown de custos.
- Cadastro de produtos.
- Salvamento de simulacoes.
- Selecao de canais de venda:
  - Site proprio
  - Shopee
  - TikTok Shop
  - Mercado Livre Classico
  - Mercado Livre Premium
  - Amazon
  - Temu
  - Shein
  - Outro / Manual

## Stack

Backend:

- Go
- Fiber
- PostgreSQL
- Migrations SQL
- JWT com cookies HttpOnly
- Login manual com senha hasheada
- Google OAuth

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- Zod
- Fetch wrapper

Infra:

- Docker Compose para desenvolvimento local
- Vercel para producao
- PostgreSQL gerenciado em producao

## Estrutura

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

## Arquitetura

O backend segue uma Clean Architecture simples, sem criar camadas desnecessarias.

### Domain

Fica em `backend/internal/domain`.

Responsabilidades:

- Entidades de dominio.
- Tipos de dominio.
- Interfaces de repositorio.
- Regras de precificacao.
- `PricingService`.

Essa camada nao depende de Fiber, PostgreSQL, JSON HTTP ou detalhes de infraestrutura.

### Infra

Fica em `backend/internal/infra`.

Responsabilidades:

- Configuracao por variaveis de ambiente.
- Conexao com PostgreSQL.
- Migrations.
- Repositorios concretos.
- Handlers HTTP.
- Middlewares.
- Rotas Fiber.
- Auth/JWT.
- Google OAuth.
- Seed inicial de canais.

### Frontend

Fica em `frontend/src`.

Organizacao principal:

- `components`: componentes reutilizaveis de interface.
- `features`: telas e fluxos por dominio funcional.
- `services`: chamadas HTTP para o backend.
- `types`: tipos compartilhados do frontend.
- `utils`: formatacao, conversao e validacoes.
- `routes`: configuracao de rotas protegidas.

## Regra de precificacao

O calculo financeiro fica centralizado no `PricingService`, em:

```txt
backend/internal/domain/pricing_service.go
```

Principios usados:

- Dinheiro em centavos com `int64`.
- Percentuais em basis points.
- 4% = `400`.
- 14% = `1400`.
- 20% = `2000`.
- Nenhuma regra financeira espalhada em handler HTTP.
- Taxas de canais vindas do banco/seed, nao hardcoded em handlers.
- Busca binaria para encontrar preco minimo quando a meta e margem desejada.

## Banco de dados

O projeto usa PostgreSQL.

Tabelas principais:

- `users`
- `sessions`
- `user_preferences`
- `marketplace_channels`
- `products`
- `pricing_simulations`

As migrations ficam em:

```txt
backend/internal/infra/migrations
```

O seed inicial de canais fica em:

```txt
backend/internal/infra/seed/channels.json
```

As taxas de marketplace sao referencias iniciais editaveis. Elas devem ser conferidas nos portais oficiais antes de uso operacional.

## Variaveis de ambiente

### Backend

Arquivo local de exemplo:

```txt
backend/.env.example
```

Variaveis principais:

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

Em producao, configurar na Vercel:

```txt
DATABASE_URL=postgres://...
FRONTEND_URL=https://pricing-hub.vercel.app
JWT_ACCESS_SECRET=um-segredo-forte
COOKIE_SECURE=true
```

Para Google OAuth:

```txt
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=https://pricing-hub.vercel.app/api/auth/google/callback
```

### Frontend

Arquivo local de exemplo:

```txt
frontend/.env.example
```

Variavel opcional:

```txt
VITE_API_URL=
```

Em producao, o frontend pode usar `/api`, porque o `vercel.json` faz o rewrite para o backend.

## Desenvolvimento local com Docker

```bash
docker compose up --build
```

Servicos locais:

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- PostgreSQL: localhost:5432

O Docker Compose sobe o PostgreSQL apenas para desenvolvimento local. Em producao, o banco precisa ser um PostgreSQL gerenciado configurado na Vercel.

## Desenvolvimento local sem Docker

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

## Deploy

O deploy usa `vercel.json` na raiz do projeto.

Configuracao principal:

- `frontend`: servico Vite apontando para `frontend`.
- `backend`: servico Go apontando para `backend/main.go`.
- `/api/*`: encaminhado para o backend.
- `/*`: encaminhado para o frontend.

Arquivo:

```txt
vercel.json
```

Antes de redeployar, confirme que as variaveis de ambiente do backend estao configuradas na Vercel, principalmente `DATABASE_URL`, `JWT_ACCESS_SECRET`, `FRONTEND_URL` e `COOKIE_SECURE`.

## Observacoes operacionais

- A Vercel nao sobe o PostgreSQL definido no `docker-compose.yml`.
- `docker-compose.yml` e apenas para ambiente local.
- Em producao, o backend precisa de um `DATABASE_URL` apontando para um banco PostgreSQL real.
- O backend executa migrations e seed automaticamente ao iniciar.
- Se o backend falhar no deploy com erro de conexao em `127.0.0.1:5432`, significa que `DATABASE_URL` nao foi configurado corretamente em producao.
- Ao mudar variaveis de ambiente na Vercel, faca um novo deploy para aplicar.
