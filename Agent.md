# pricing-hub Agent Checkpoint

Este arquivo é a memória operacional do projeto para novos chats/agentes. Antes de qualquer correção, feature, review ou plano, leia este checkpoint junto com o `README.md`.

## Contexto Geral

`pricing-hub` é um sistema full-stack para precificação de produtos vendidos em e-commerce e marketplaces.

O objetivo principal é permitir que o usuário:

- cadastre produtos;
- selecione um canal de venda e um produto já cadastrado para precificar;
- informe a quantidade do kit (o custo total do kit é calculado automaticamente a partir do custo unitário do produto);
- informe impostos, ads, custos fixos, logística, taxas extras e custos manuais;
- pré-configure um modelo padrão de taxas/custos (aba "Taxas e Custos") para não repetir a digitação a cada novo cálculo;
- calcule o preço recomendado para uma margem desejada;
- analise um preço de venda informado e veja lucro líquido/margem real;
- salve simulações e visualize-as em lista;
- edite simulações salvas;
- alterne tema claro/escuro;
- faça login manual ou via Google OAuth.

O projeto está organizado como monorepo na raiz `pricing-hub`, sem subpasta extra `precificadora`.

Estrutura principal atual:

```txt
pricing-hub/
  backend/
  frontend/
  docker-compose.yml
  vercel.json
  README.md
  Agent.md
```

## Stack

Backend:

- Go
- Fiber
- PostgreSQL
- SQL migrations
- JWT com cookies HttpOnly
- Login manual com senha hasheada (bcrypt)
- Google OAuth preparado por variáveis de ambiente

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- Zod
- Fetch wrapper
- Lucide React para ícones

Infra:

- Docker Compose para desenvolvimento local
- Vercel para produção e previews
- PostgreSQL gerenciado na Vercel/Storage em produção

## Produção e Deploy

URL de produção atual:

```txt
https://pricing-hub.vercel.app
```

O deploy usa `vercel.json` na raiz.

Configuração importante:

- serviço `frontend`: root `frontend`, framework `vite`;
- serviço `backend`: root `backend`, framework `go`, entrypoint `main.go`;
- rewrite `/api/(.*)` para o backend;
- rewrite `/(.*)` para o frontend;
- rotas do SPA fallback do frontend (`services.frontend.routes[0].src`) precisam listar TODAS as rotas client-side (`pricing|finance|products|simulations|taxes|settings|login|register`). Se uma rota nova for criada no React Router e não for adicionada aqui, o refresh direto naquela URL quebra em produção (já aconteceu duas vezes, ver histórico de commits `fix: corrigir fallback de rotas SPA no Vercel`).

Arquivo:

```txt
vercel.json
```

Ponto importante: a Vercel não sobe o PostgreSQL do `docker-compose.yml`. O banco de produção precisa ser um PostgreSQL gerenciado, conectado ao projeto e exposto para o backend via `DATABASE_URL`.

Variáveis essenciais em produção:

```txt
DATABASE_URL=postgres://...
FRONTEND_URL=https://pricing-hub.vercel.app
JWT_ACCESS_SECRET=uma-chave-forte
COOKIE_SECURE=true
```

OAuth Google, se usado:

```txt
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=https://pricing-hub.vercel.app/api/auth/google/callback
```

Se a Vercel mostrar erro de conexão com `127.0.0.1:5432`, o backend está tentando acessar banco local em produção. Isso indica `DATABASE_URL` incorreta ou ausente no ambiente da Vercel.

Se um deploy da Vercel falhar logo após `Cloning completed`, sem logs de install/build (`npm`, `vite`, `go build`, `tsc`), trate primeiro como erro transitório/configuração de deploy. Tente `Redeploy without Build Cache` antes de alterar código.

Nota sobre health check: `/health` é registrado fora do grupo `/api` (direto no `app` Fiber). Como o `vercel.json` só encaminha `/api/(.*)` para o backend, `/health` puro não é alcançável em produção, e `/api/health` cai no middleware de auth (retorna 401, não 404) porque não existe rota específica ali. Isso é uma limitação conhecida, não um bug novo — não há health check funcional exposto publicamente hoje.

## Arquitetura Backend

**Esta seção foi reescrita em 2026-07-31 após um refactor completo de arquitetura. Se você é um agente novo, ignore qualquer menção anterior a `backend/internal/domain/pricing_service.go` ou a uma divisão simples `domain/infra` sem sub-pastas por entidade — isso é histórico, não reflete mais o código.**

O backend segue Clean Architecture com separação explícita entre `domain` (regra de negócio) e `infrastructure` (frameworks, banco, integrações externas), inspirada na estrutura de outro projeto de referência (`john-v2-poc`, Python/FastAPI) mas adaptada aos idiomas do Go e mantendo pontos em que o `pricing-hub` já era mais correto (repository como interface, repository dono de leitura E escrita, cobertura de testes).

```txt
backend/
  main.go                          # entrypoint (idêntico a cmd/api/main.go, usado pela Vercel)
  cmd/api/main.go                  # entrypoint alternativo (mesmo conteúdo de main.go)
  internal/
    domain/
      shared/
        errors.go                 # erros de domínio compartilhados (shared.ErrInvalidInput, shared.ErrNotFound, etc.)
      channel/
        model.go                  # entidade Channel, FeeRules, FeeTier, CategoryFeeRule, FeeOptionRule
        repository.go             # interface Repository (List, FindByCode)
        repository_postgres.go    # implementação Postgres da interface
        service.go                # Service (fino — delega ao repository; sem regra de negócio própria hoje)
        controller.go             # rotas HTTP (List, Get)
        seed.go + channels.json   # seed automático das taxas de marketplace no startup
      finance/
        model.go                  # Kind (income/expense), Category, Transaction, TransactionView,
                                   #   Period, MonthlyPoint, SummaryLine, Summary
        repository.go             # interfaces CategoryRepository, TransactionRepository
        repository_postgres.go    # implementação Postgres (transações usam overlap de período:
                                   #   period_start <= fim AND period_end >= início)
        service.go                # defaultCategories (seed automático por usuário, não por migration),
                                   #   CRUD de categoria/transação, Summary (DRE + comparação com período
                                   #   anterior), Series (janela de 6 meses)
        controller.go             # rotas HTTP (categorias, transações, summary, series)
        request.go                # CategoryRequest, TransactionRequest
      identity/
        model.go                  # User, Session
        repository.go             # interfaces UserRepository, SessionRepository
        user_repository.go        # implementação Postgres de UserRepository
        session_repository.go     # implementação Postgres de SessionRepository
        service.go                # Service — TODA a regra de negócio de auth (Register, Login, Logout,
                                   #   Refresh, Me, GoogleAuthURL, GoogleCallback, issueSession). Não importa
                                   #   Fiber — zero dependência de HTTP.
        controller.go             # rotas HTTP + cookies (access_token, refresh_token, oauth_state). Só
                                   #   lida com HTTP; delega toda decisão de negócio ao service.
        request.go                # RegisterRequest, LoginRequest, UserResponse, AuthResponse
      preferences/
        model.go                  # Theme, DefaultCosts, UserPreference
        repository.go             # interface Repository (Get, UpsertTheme, UpsertDefaultCosts)
        repository_postgres.go    # implementação Postgres
        service.go                # Service — validação de tema e de DefaultCosts (validateDefaultCosts)
        controller.go             # rotas HTTP (Get, UpdateTheme, UpdateDefaultCosts)
        request.go                # Request (tema)
      pricing/
        model.go                  # PricingInput, PricingResult, ManualCost, VariableCost, ChannelOptions, etc.
        service.go                # PricingService — cálculo financeiro (Calculate) + orquestração
                                   #   (CalculateForChannel: resolve o Channel via channel.Repository injetado
                                   #   e chama Calculate). NÃO tem repository próprio: pricing é cálculo puro,
                                   #   sem persistência.
        service_test.go           # 9 testes cobrindo tiers de canal, margem-alvo, custo zero, prejuízo
        controller.go             # rota HTTP (Calculate) — fino, só parse+delegate
        request.go                # Request + ToInput()
      product/
        model.go, repository.go, repository_postgres.go   # CRUD completo (List/Create/FindByID/Update/Delete)
        service.go                # Service — validação de Request (productFromRequest: trim, custo >= 0)
        service_test.go           # testes de validação com repository fake
        controller.go             # rotas HTTP (List, Create, Get, Update, Delete)
        request.go
      simulation/
        model.go, repository.go, repository_postgres.go   # CRUD completo
        service.go                # Service — validação de Request (simulationFromRequest: título/canal
                                   #   obrigatórios, descrição em branco vira nil)
        service_test.go
        controller.go
        request.go
    infrastructure/
      auth/
        password.go                # HashPassword/ComparePassword (bcrypt)
        tokens.go                  # TokenService (JWT access token), NewRefreshToken, NewStateToken
      config/
        config.go                  # Settings via variáveis de ambiente (Config, Load())
      database/
        postgres.go                # Connect (pgxpool)
        migrations.go               # RunMigrations (aplica *.sql em ordem, idempotente via schema_migrations)
        errors.go                   # MapError (mapeia erros do Postgres para shared.Err*)
      migrations/
        001_init.sql, 002_simulation_description.sql, 003_default_costs.sql, 004_finance.sql, embed.go
      oauth/
        google.go                   # GoogleOAuth (AuthCodeURL, ExchangeUser)
      http/
        auth.go                     # middleware transport.Auth (valida JWT do cookie access_token)
        response.go                 # transport.RespondError, transport.ParseBody (helpers genéricos)
        routes/routes.go            # routes.Register — registro CENTRALIZADO de todas as rotas (decisão
                                     #   deliberada: ao contrário do projeto de referência, que descentraliza
                                     #   rotas por controller, aqui mantivemos um único ponto de registro por
                                     #   pedido explícito do usuário)
```

### Padrão Controller → Service → Repository

Todo domínio (exceto `pricing`, que não persiste nada) segue o mesmo fluxo:

1. **`controller.go`**: recebe a requisição Fiber, faz `transport.ParseBody[Request]`, chama exatamente um método do `service`, traduz o resultado/erro para HTTP (`transport.RespondError`, `c.JSON(...)`). Não deve conter `if`/validação de regra de negócio.
2. **`service.go`**: recebe tipos Go simples (não `*fiber.Ctx`), valida entrada, aplica regra de negócio, chama o `repository` (que é sempre uma **interface**, nunca o tipo concreto Postgres). Zero import de Fiber.
3. **`repository.go`** (interface) + **`repository_postgres.go`** (implementação): único lugar que fala SQL. Cobre leitura E escrita — ao contrário do projeto de referência usado como inspiração, aqui o repository nunca foi split em "só leitura" com escrita duplicada no service.

Isso permite mockar `Repository` em teste de `service.go` sem precisar de banco (ver `product/service_test.go`, `simulation/service_test.go`, `preferences/service_test.go`, `identity/service_test.go` para o padrão de fake repository em memória).

### Regras que devem continuar valendo

- `domain/*` não deve depender de Fiber, exceto `controller.go` (é a única camada que sabe que existe HTTP);
- `domain/*` não deve depender de PostgreSQL, exceto `repository_postgres.go`;
- cálculo financeiro deve continuar centralizado em `PricingService` (`internal/domain/pricing/service.go`);
- não espalhar regra de cálculo em controllers;
- `routes.go` é o único lugar que registra rotas — não crie `router` dentro de um `controller.go` individual (isso quebraria a decisão de manter registro centralizado).

## Regra de Precificação

Arquivo principal:

```txt
backend/internal/domain/pricing/service.go
```

Princípios obrigatórios:

- dinheiro em centavos (`int64`);
- percentuais em basis points;
- `4% = 400`;
- `14% = 1400`;
- `20% = 2000`;
- não usar `float64` para dinheiro;
- taxas de canal vêm do banco/seed, não dos controllers;
- cálculo por margem desejada usa busca binária porque taxas podem variar por faixa de preço;
- `PricingService.CalculateForChannel(ctx, input)` é o ponto de entrada usado pelo controller — resolve o canal (`channel.Repository.FindByCode`) e então chama `Calculate(input, salesChannel)`. `Calculate` sozinho (sem buscar canal) é o que os testes chamam diretamente.

Comportamento atual importante:

- se `ProductCostCents == 0`, o resultado deve ficar zerado (evita preço recomendado artificial como `R$ 0,03`);
- existe teste cobrindo esse cenário em `backend/internal/domain/pricing/service_test.go`.

As taxas iniciais dos marketplaces ficam em:

```txt
backend/internal/domain/channel/channels.json
```

Elas são referências editáveis. Não tratar como verdade definitiva. Sempre preservar a ideia de que devem ser conferidas nos portais oficiais.

## Banco de Dados

Banco: PostgreSQL.

Migrations:

```txt
backend/internal/infrastructure/migrations
```

Tabelas principais:

- `users`
- `sessions`
- `user_preferences` (inclui `theme` e `default_costs_json`)
- `marketplace_channels`
- `products`
- `pricing_simulations`
- `finance_categories`
- `finance_transactions`

O backend executa migrations e seed automaticamente no startup.

Migration mais recente:

```txt
backend/internal/infrastructure/migrations/004_finance.sql
```

Cria `finance_categories` e `finance_transactions` (com checks de `kind`, FKs e índices). Diferente das outras tabelas, as 12 categorias-padrão (Faturamento, Impostos, Marketing, etc.) **não** vêm de INSERT nessa migration — são semeadas em runtime, por usuário, na primeira chamada de `finance.Service.ListCategories` (`defaultCategories` em `backend/internal/domain/finance/service.go`).

Migration anterior:

```txt
backend/internal/infrastructure/migrations/003_default_costs.sql
```

Adiciona `default_costs_json jsonb not null default '{...}'` em `user_preferences`, com um JSON default sensato (`tax_bps: 400`, resto zerado) — isso garante que usuários existentes e novos usuários que nunca configuraram a aba "Taxas e Custos" continuem vendo o comportamento histórico (4% de imposto como ponto de partida), sem precisar de lógica especial no Go.

Localmente, o PostgreSQL vem do Docker Compose. Em produção, o PostgreSQL deve ser gerenciado pela Vercel/Storage ou outro provedor externo, nunca pelo `docker-compose.yml`.

## Arquitetura Frontend

Código principal:

```txt
frontend/src
```

Organização:

- `components`: componentes reutilizáveis;
- `features`: telas e fluxos por domínio funcional;
- `services`: chamadas HTTP;
- `types`: tipos compartilhados;
- `utils`: formatação, conversão e validação;
- `routes`: rotas protegidas.

Rotas principais:

- `/login`
- `/register`
- `/pricing`
- `/finance` (nova — ver seção "Financeiro"; índice redireciona para `/finance/dashboard`)
  - `/finance/dashboard`
  - `/finance/transactions`
  - `/finance/categories`
- `/products`
- `/simulations`
- `/taxes` (ver seção "Taxas e Custos")
- `/settings`

A rota principal da aplicação é `/pricing`. Tema escuro é o padrão.

**Importante**: existe navegação duplicada em TRÊS lugares (não dois):

- `frontend/src/components/Sidebar.tsx` (desktop, `lg:block`) — array `navItems` para os itens de topo, mais um bloco expansível "Financeiro" com array próprio `financeSubItems` (Dashboard/Transações/Categorias) que expande/recolhe (`financeExpanded`, com `useEffect` auto-expandindo quando `location.pathname` começa com `/finance`);
- `frontend/src/components/Topbar.tsx` (mobile, `lg:hidden`, array `mobileItems`) — tem um item "Financeiro" que leva a `/finance`, sem sub-itens (só o ícone);
- `frontend/src/features/finance/FinanceLayout.tsx` — barra de sub-abas (Dashboard/Transações/Categorias) com `lg:hidden`: é o equivalente mobile da navegação aninhada que só existe em desktop na Sidebar.

Ao adicionar/remover uma rota do menu, verifique os três. Se for uma sub-aba do Financeiro especificamente, `Sidebar.tsx` (`financeSubItems`) e `FinanceLayout.tsx` (`subTabs`) têm listas independentes com os mesmos itens — as duas precisam mudar junto.

## Estado Atual da Experiência

A tela principal se chama **Precificador**.

Arquivos centrais da experiência:

```txt
frontend/src/features/pricing/PricingPage.tsx
frontend/src/components/ProductCard.tsx
frontend/src/components/CostsPercentTable.tsx
frontend/src/components/ManualCostsEditor.tsx   (usado dentro de CostsPercentTable, não mais standalone)
frontend/src/components/ResultsPanel.tsx
frontend/src/utils/pricingDraft.ts              (chave de localStorage + helpers compartilhados)
```

### Bloco "Produto" do Precificador (reestruturado nesta sessão)

O componente `ProductCard.tsx` deixou de ser só "produto" — hoje concentra também a seleção de canal. Ordem dos campos dentro do card:

1. **Canal** — `<select>` (não mais os botões pill do antigo `ChannelSelector.tsx`, que foi removido do projeto por ficar sem uso). Ao trocar, reseta `channel_options` (categoria/overrides/opções habilitadas) do mesmo jeito que antes.
2. **Produto** — `<select>` que lista os produtos cadastrados na aba Produtos (busca via `listProducts()`). Substituiu o campo de texto livre "Título".
3. **Quantidade** — campo numérico (kit/lote), padrão 1.
4. **Custo do produto** — **calculado automaticamente** (`custo unitário do produto selecionado × quantidade`) e **desabilitado** (`MoneyInput` ganhou prop `disabled`). O custo unitário fica em `product_unit_cost_cents` no estado do formulário, nunca aparece na tela.
5. **Preço de venda** — igual a antes, campo em destaque.

Removidos desse bloco: campo "Categoria" (não confundir com "Categoria do canal", que continua existindo no `ChannelOptionsPanel` para canais como Amazon) e o botão de salvar produto (produtos agora só se cadastram na aba Produtos).

Comportamentos que continuam valendo:

- rascunho do formulário do Precificador é persistido em `localStorage` (chave em `frontend/src/utils/pricingDraft.ts`);
- trocar de rota, aba interna ou recarregar a página não apaga o trabalho atual;
- ordem de canais no seletor: Shopee, Temu, TikTok Shop, Shein, Mercado Livre Clássico, Mercado Livre Premium, Amazon, Outro / Manual (`Outro / Manual` por último);
- `Loja própria/Site` não aparece no seletor principal do Precificador;
- ortografia da UI em português correto.

### Produtos e Simulações em formato de tabela

Ambas as páginas (`frontend/src/features/products/ProductsPage.tsx` e `frontend/src/features/simulations/SimulationsPage.tsx`) trocaram cards por tabela HTML compacta (linhas finas, `py-1.5`).

Colunas de Simulações, nesta ordem: **Simulação | Quantidade | Preço de custo | Preço de venda | Margem | Lucro | Plataforma** (mais coluna de ações). "Plataforma" resolve o `channel_code` salvo pro nome do canal via `listChannels()`. A coluna "Data" foi removida.

## Taxas e Custos (feature nova)

Aba entre "Simulações" e "Ajustes" (`/taxes`, `frontend/src/features/taxes/TaxesPage.tsx`) onde o usuário pré-configura um modelo padrão de: Impostos, Ads, Custos fixos, Taxas extras, Desconto vendedor, Logística e Custos adicionais — os mesmos campos do bloco "Custos" do Precificador, reaproveitando o componente `CostsPercentTable.tsx` (que teve seu tipo de prop trocado de `PricingInput` para `DefaultCosts`, um subconjunto).

Dois botões, ações independentes:

- **Salvar modelo**: persiste no backend via `PUT /preferences/default-costs` (`preferences.Service.UpdateDefaultCosts`, validação em `validateDefaultCosts`). Vira o padrão usado quando o Precificador inicia sem rascunho salvo ou quando o usuário clica "Limpar campos".
- **Aplicar no Precificador**: escreve os valores **atuais da tela** (mesmo que não salvos) direto no rascunho do Precificador (`localStorage`, via `mergeIntoPricingDraft` em `frontend/src/utils/pricingDraft.ts`) e navega para `/pricing`. Não depende de "Salvar modelo" ter sido clicado.

Importante: os campos do bloco "Custos" continuam 100% editáveis manualmente na tela do Precificador — a aba Taxas e Custos só define o ponto de partida, nunca trava a edição.

Backend:

```txt
backend/internal/domain/preferences/model.go       (DefaultCosts)
backend/internal/domain/preferences/service.go     (validateDefaultCosts)
backend/internal/infrastructure/migrations/003_default_costs.sql
```

## Financeiro (feature nova)

Seção nova (`/finance`), no menu abaixo de "Precificador". Objetivo: o usuário lança TOTAIS de receita/despesa por categoria e por período (não lançamentos individuais do dia a dia — ex.: "gastei R$600 em Marketing este mês", um número só), e o sistema calcula uma DRE simplificada (lucro real, margem, comparação com o período anterior).

Sub-rotas, todas usando o período compartilhado via `frontend/src/utils/financePeriod.ts` (persistido em `localStorage`, chave `pricing-hub:finance-period:v1` — trocar de sub-aba não reseta o período escolhido):

- `/finance/dashboard` (`frontend/src/features/finance/DashboardPage.tsx`) — 4 KPIs (Faturamento Total, Lucro Real, Margem de Lucro, Despesas Totais) com variação vs. período anterior; card de composição de custos (donut SVG + legenda); DRE completa em tabela.
- `/finance/transactions` (`frontend/src/features/finance/TransactionsPage.tsx`) — lista dos lançamentos do período + modal (backdrop desfocado) para criar/editar. Exporta `PeriodPicker`, reaproveitado pelo Dashboard.
- `/finance/categories` (`frontend/src/features/finance/CategoriesPage.tsx`) — CRUD de categorias (nome, tipo receita/despesa, ícone). 12 categorias-padrão são semeadas automaticamente por usuário na primeira chamada de `ListCategories` (`defaultCategories` em `backend/internal/domain/finance/service.go`) — não vêm de uma migration.

Backend: ver entrada `finance/` na árvore da seção "Arquitetura Backend" acima, mais `backend/internal/infrastructure/migrations/004_finance.sql`. Rotas registradas em `routes.go` (todas protegidas por auth): `GET/POST /finance/categories`, `PUT/DELETE /finance/categories/:id`, `GET/POST /finance/transactions`, `PUT/DELETE /finance/transactions/:id`, `GET /finance/summary`, `GET /finance/series`.

Frontend:

```txt
frontend/src/types/index.ts               # FinanceKind, FinanceCategory, FinanceTransaction,
                                           #   FinanceMonthlyPoint, FinanceSummaryLine, FinanceSummary
frontend/src/services/finance.ts          # CRUD + getSummary/getSeries, tipo Period, periodQuery()
frontend/src/utils/financeIcons.tsx       # financeIcons (24 ícones lucide; chave é a string salva no banco)
frontend/src/utils/financePeriod.ts       # currentMonthPeriod, read/writeFinancePeriod,
                                           #   monthStartISODate/monthEndISODate (ver nota do seletor abaixo)
frontend/src/features/finance/FinanceLayout.tsx     # <Outlet/> + sub-abas (nav só em mobile, lg:hidden)
frontend/src/features/finance/DashboardPage.tsx     # KPIs + Donut + DRE
frontend/src/features/finance/TransactionsPage.tsx  # lista + modal; exporta PeriodPicker
frontend/src/features/finance/CategoriesPage.tsx    # CRUD de categoria
```

Decisões e detalhes não óbvios desta feature (importante ler antes de mexer):

- **Seletor de período é só mês/ano** (`<input type="month">`, não `type="date"`) — o usuário escolhe algo como "08/2026", nunca um dia específico. Por baixo, `Period.start`/`Period.end` continuam sendo datas ISO completas (`YYYY-MM-DD`), porque o backend segue validando/comparando por dia (`parsePeriod`, overlap de transação). A conversão mês→primeiro dia / mês→último dia acontece só na UI, em `financePeriod.ts` (`monthStartISODate`/`monthEndISODate`). Não reintroduza inputs de dia completo aqui sem pedido explícito.
- **`Topbar.tsx` não é mais `sticky`** (era `sticky top-0 z-20`; hoje só tem as classes de borda/fundo). Removido a pedido do usuário porque o header ficava grudado no topo ao rolar o Dashboard (página bem mais longa que as outras). É uma mudança **global**, afeta todas as rotas, não só `/finance`. Se pedirem sticky de volta, é só reintroduzir `sticky top-0 z-20` nessa linha.
- **O Dashboard não tem gráfico de linha/série temporal** — os dois gráficos que existiam ("Lucro Real ao Longo do Tempo", "Margem de Lucro (%)") foram removidos a pedido do usuário (ficavam com aparência "quebrada" com poucos meses de histórico) e substituídos por uma segunda grade 2×2 reaproveitando os mesmos 4 `KpiCard` do topo da página. É duplicação intencional das mesmas 4 métricas na mesma tela — foi pedido assim explicitamente, não é engano.
- **A API de série mensal continua existindo e testada** (`GET /finance/series`, `finance.Service.Series`, `services/finance.ts#getSeries`, tipo `FinanceMonthlyPoint`), só que sem nenhum consumidor no frontend depois da remoção acima. Não é dead code para apagar sem pensar — é uma capacidade pronta caso um gráfico de evolução volte em outro formato.
- **Donut** (função `Donut` dentro de `DashboardPage.tsx`) é 200×200 (era 140×140), com o texto central (`Total` / valor / `% do faturamento`) limitado a `max-w-[112px]` para nunca vazar por cima do anel colorido. Se for aumentar o donut de novo, mantenha essa largura máxima proporcional ao raio interno (`radius - strokeWidth/2`), senão o texto volta a vazar com categorias de nome longo.

## Simulações

Simulações podem ser editadas (modal simples: nome, descrição, título do produto salvo).

Arquivos relevantes:

```txt
frontend/src/features/simulations/SimulationsPage.tsx
frontend/src/services/simulations.ts
backend/internal/domain/simulation/controller.go
backend/internal/domain/simulation/service.go
backend/internal/domain/simulation/repository_postgres.go
backend/internal/domain/simulation/model.go
backend/internal/infrastructure/http/routes/routes.go
```

Contrato atual:

- `GET /simulations`
- `POST /simulations`
- `GET /simulations/:id`
- `PUT /simulations/:id`
- `DELETE /simulations/:id`

`PricingInput.Quantity` é persistido desde esta sessão (antes era descartado silenciosamente porque a struct Go não tinha o campo — cuidado ao adicionar campo novo no `PricingInput` do frontend sem espelhar em `backend/internal/domain/pricing/model.go`, o `encoding/json` do Go ignora silenciosamente campos desconhecidos).

## Alterações Importantes Já Feitas

### Base full-stack, correções de input monetário, organização de pastas, Vercel

(Histórico anterior a esta sessão — ver commits antigos se precisar do detalhe. Resumo: base full-stack criada; bugs de digitação em campos monetários corrigidos via estado de rascunho local em `MoneyInput.tsx`; bug de perda de foco em custos manuais corrigido com chaves estáveis; projeto movido de `precificadora/` para a raiz; `vercel.json` ajustado para multi-service.)

### Sessão de refactor grande (2026-07-31)

Nesta sessão, em sequência:

1. **Produtos e Simulações viraram tabela** (não mais cards).
2. **Bloco Produto do Precificador reestruturado**: seleção de produto cadastrado (em vez de texto livre) + quantidade + custo total calculado automaticamente (somente leitura) + remoção de Categoria e do botão salvar produto.
3. **Quantidade persistida nas simulações**: campo `Quantity` adicionado em `pricing.PricingInput` (Go) — antes era descartado silenciosamente.
4. **Canal movido para dentro do bloco Produto**: era uma seção própria com botões pill (`ChannelSelector.tsx`, removido do projeto); virou `<select>` no topo do card Produto, mesmo estilo do seletor de produto.
5. **Aba "Taxas e Custos" criada**: modelo padrão de custos persistido em `user_preferences.default_costs_json`, aplicado automaticamente no Precificador (quando não há rascunho) e via botão "Aplicar no Precificador".
6. **Refactor completo de arquitetura do backend**: de `backend/internal/<entidade>/{entity,handler,repository,repository_postgres,request}.go` (mais `core/` e `infra/` soltos) para `backend/internal/domain/<entidade>/{model,repository,repository_postgres,service,controller,request}.go` + `backend/internal/domain/shared/` + `backend/internal/infrastructure/`. Cada entidade ganhou uma camada `service.go` que antes não existia (a regra de negócio — validação de request, orquestração — vivia dentro do `handler.go`). `Handler`/`NewHandler` viraram `Controller`/`NewController` em todo o backend. `routes.go` continua centralizado (decisão explícita, ao contrário do projeto de referência que inspirou a estrutura). Testes de `service.go` adicionados para `product`, `simulation`, `preferences`, `identity` (usando fakes de repository em memória, possível porque os repositories já eram interfaces). Validado com `go build`, `go vet`, `go test` (todos limpos) e smoke test completo end-to-end via Docker (login/logout, cálculo de preço com canal, CRUD de produto, listagem de simulações, Taxas e Custos).

Branch de trabalho: `develop`, depois merge fast-forward em `main` (sem conflitos — `main` sempre foi um ancestral direto de `develop` neste projeto até agora).

### Sessão Financeiro (2026-08-01)

Nesta sessão, em sequência:

1. **Feature Financeiro completa**: backend (`domain/finance` + migration `004_finance.sql`) e frontend (Dashboard/Transações/Categorias) — detalhes na seção "Financeiro (feature nova)" acima.
2. **Navegação do Financeiro movida para a Sidebar**: as sub-abas (Dashboard/Transações/Categorias), que inicialmente ficavam numa barra horizontal no topo do conteúdo, passaram a ficar aninhadas embaixo de "Financeiro" na Sidebar esquerda (desktop), expandindo automaticamente ao entrar em qualquer rota `/finance/*`. A barra horizontal original (`FinanceLayout.tsx`) virou `lg:hidden` — hoje só aparece em mobile, como equivalente da navegação aninhada que só existe em desktop.
3. **Correções pedidas depois de teste manual do usuário** (dados diferentes dos meus testes escancararam bugs de layout que só aparecem com poucos dados):
   - gráficos de linha com 1 único mês de histórico pareciam "quebrados" (um ponto solto, sem linha) → corrigido com mensagem amigável para `< 2` pontos (fix intermediário; depois os dois gráficos de linha foram removidos de vez, ver item 4 abaixo);
   - legenda do donut cortava categorias e as fatias não tinham tooltip → corrigido com legenda empilhada rolável e `<title>` em cada fatia;
   - texto central do donut (Total/valor/%) vazava por cima do anel colorido com categorias/valores maiores → corrigido aumentando o donut (140→200px) e limitando o texto a `max-w-[112px]`;
   - header (`Topbar.tsx`) ficava `sticky` grudado no topo ao rolar o Dashboard → removido `sticky top-0 z-20` (mudança global, todas as rotas, não só Financeiro);
   - os dois gráficos de linha (Lucro Real / Margem de Lucro ao longo do tempo) foram removidos e substituídos por uma segunda grade 2×2 dos mesmos 4 KPIs já exibidos no topo da página (duplicação intencional, pedida explicitamente);
   - seletor de período trocado de `<input type="date">` (dia completo) para `<input type="month">` (só mês/ano), com conversão mês→primeiro/último dia feita em `financePeriod.ts` só na camada de UI — backend continua recebendo/validando datas completas.

Branch de trabalho: `develop`. **Checkpoint no momento em que esta nota foi escrita: ainda não mesclado/enviado** — feature grande, aguardando revisão do usuário antes de qualquer push (pedido explícito dele: "NÃO SUBA NADA AINDA"). Se você é um agente novo lendo isso depois do push ter acontecido, essa frase já está desatualizada — confira `git log`/`git status` em vez de confiar nela.

## Docker Local

Serviços locais esperados:

```txt
Frontend: http://localhost:5173
Backend: http://localhost:8080
PostgreSQL: localhost:5432
```

Comando recomendado depois de alterações de código:

```bash
docker compose up -d --build
```

Motivo: o `frontend/Dockerfile` usa `COPY . .`, e o `docker-compose.yml` atual não monta o código local como volume no serviço frontend. Se rodar Docker com imagem antiga, `localhost:5173` pode continuar mostrando layout antigo mesmo com o código local atualizado. O mesmo vale para o backend (rebuild necessário após qualquer mudança em `.go`).

Se `localhost:5173` mostrar layout antigo:

1. confirme se o código local está atualizado;
2. rode `docker compose up -d --build`;
3. faça hard refresh no navegador (`Cmd + Shift + R`).

## Comandos de Validação

Backend:

```bash
cd backend
go build ./...
go vet ./...
go test ./...
gofmt -l .
```

Ou, a partir da raiz:

```bash
(cd backend && go build ./... && go vet ./... && go test ./...)
```

Importante: `go test ./...` na raiz do monorepo falha porque o módulo Go fica em `backend/`.

Frontend:

```bash
cd frontend
npm run test
npm run lint
npm run build
```

Ou, a partir da raiz:

```bash
npm run test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Docker local:

```bash
docker compose up -d --build
```

## Estado Git e Branches

Branches principais:

```txt
main
develop
```

Fluxo usado nesta sessão para toda alteração: trabalhar em `develop`, validar, e mesclar (`git merge develop`, sempre fast-forward até agora) em `main`, depois `git push origin develop && git push origin main`.

**Atenção de ambiente**: o remoto `origin` está configurado como `git@github.com:jotaGGod/pricing-hub.git` (SSH), mas nem todo ambiente de execução tem chave SSH configurada. Se `git fetch`/`push` falhar com `Permission denied (publickey)`, rode:

```bash
gh auth setup-git
git remote set-url origin https://github.com/jotaGGod/pricing-hub.git
```

(`gh` já autenticado como `jotaGGod` costuma resolver — o token do `gh` passa a servir de credencial HTTPS.) Não faça isso sem necessidade; só quando o SSH falhar de fato.

O arquivo `.idea/` pode aparecer como untracked local. É configuração local da IDE e não deve ser removido ou commitado sem pedido explícito do usuário.

## Como Um Novo Agente Deve Proceder

Antes de implementar qualquer coisa:

1. Leia este `Agent.md`.
2. Leia o `README.md` (pode estar desatualizado em relação à arquitetura backend — este `Agent.md` é a fonte da verdade mais recente).
3. Rode `git status --short --branch`.
4. Identifique exatamente quais arquivos precisam mudar.
5. Evite alterações amplas ou refactors não solicitados.
6. Depois da alteração, rode os testes/builds proporcionais ao escopo.
7. Informe claramente o que mudou e o que foi validado.

Se a tarefa envolver **precificação** (cálculo, regras de taxa), comece por:

```txt
backend/internal/domain/pricing/service.go
backend/internal/domain/pricing/service_test.go
backend/internal/domain/pricing/model.go
frontend/src/features/pricing/PricingPage.tsx
frontend/src/components/ProductCard.tsx      (canal + produto + quantidade)
frontend/src/components/CostsPercentTable.tsx
frontend/src/components/ResultsPanel.tsx
```

Se a tarefa envolver **auth/deploy**, comece por:

```txt
backend/internal/domain/identity/service.go
backend/internal/domain/identity/controller.go
backend/internal/infrastructure/auth
backend/internal/infrastructure/config/config.go
frontend/src/services/auth.ts
vercel.json
```

Se a tarefa envolver **qualquer outro domínio do backend** (product, simulation, channel, preferences, finance), o padrão é sempre o mesmo — `backend/internal/domain/<entidade>/{model,repository,repository_postgres,service,controller,request}.go`. Regra de negócio/validação vai em `service.go`; HTTP puro vai em `controller.go`; SQL vai em `repository_postgres.go`.

Se a tarefa envolver **inputs monetários/custos manuais**, comece por:

```txt
frontend/src/components/MoneyInput.tsx
frontend/src/components/ManualCostsEditor.tsx  (usado dentro de CostsPercentTable)
frontend/src/utils/money.ts
frontend/src/utils/validation.ts
```

Se a tarefa envolver **simulações**, comece por:

```txt
frontend/src/features/simulations/SimulationsPage.tsx
frontend/src/services/simulations.ts
backend/internal/domain/simulation/controller.go
backend/internal/domain/simulation/service.go
backend/internal/domain/simulation/repository_postgres.go
```

Se a tarefa envolver **Taxas e Custos / modelo padrão**, comece por:

```txt
frontend/src/features/taxes/TaxesPage.tsx
frontend/src/utils/pricingDraft.ts
backend/internal/domain/preferences/service.go
backend/internal/domain/preferences/model.go
```

Se a tarefa envolver **Financeiro** (dashboard, transações, categorias), comece por:

```txt
backend/internal/domain/finance/service.go
backend/internal/domain/finance/model.go
frontend/src/features/finance/DashboardPage.tsx
frontend/src/features/finance/TransactionsPage.tsx
frontend/src/features/finance/CategoriesPage.tsx
frontend/src/utils/financePeriod.ts
frontend/src/components/Sidebar.tsx        (navegação aninhada do Financeiro)
```

## Cuidados Para Novas Alterações

Ao trabalhar neste projeto:

- faça mudanças pequenas e focadas;
- não mexa em módulos fora do escopo pedido;
- não mova novamente a estrutura para dentro de outra pasta;
- **respeite a separação controller → service → repository**: regra de negócio/validação nunca em `controller.go`; SQL nunca em `service.go`; `repository.go` continua sendo interface, `repository_postgres.go` a implementação;
- não use `float64` para dinheiro;
- não hardcode taxas de marketplace em controllers ou componentes espalhados;
- preserve a lógica de centavos e basis points;
- preserve cookies HttpOnly na auth;
- preserve `/api` como fallback de produção no frontend;
- preserve `vercel.json` para multi-service deploy — **e lembre de adicionar qualquer rota nova do frontend ao regex de SPA fallback**;
- ao adicionar/remover item de navegação no frontend, atualize `Sidebar.tsx`, `Topbar.tsx` e, se for sub-aba do Financeiro, também `FinanceLayout.tsx` (três listas independentes, não compartilhadas);
- não assuma que Docker Compose vale para produção;
- não commite segredos reais;
- não remova `.env.example`;
- antes de alterar deploy, confirme o impacto na Vercel;
- revise textos visíveis em português antes de finalizar mudanças de UI;
- se adicionar campo novo em `PricingInput` no frontend (`frontend/src/types/index.ts`), espelhe em `backend/internal/domain/pricing/model.go` (`PricingInput` Go) — o `encoding/json` do Go descarta campos desconhecidos silenciosamente, sem erro.

## Resumo Mental do Projeto

Pense no `pricing-hub` como uma calculadora operacional de margem para vendedores de marketplace.

O backend guarda usuários, preferências (incluindo modelo padrão de custos), produtos, simulações, canais e lançamentos financeiros, organizados em `backend/internal/domain/<entidade>/` com a cadeia `controller → service → repository` e `backend/internal/infrastructure/` para tudo que é framework/banco/integração externa. O domínio calcula preço/lucro usando centavos e basis points, centralizado em `PricingService`. O frontend fornece uma experiência visual escura, com formulário de precificação (canal + produto cadastrado + quantidade → custo automático → preço de venda), listas em tabela para produtos e simulações, um modelo padrão de custos configurável (Taxas e Custos), salvamento/edição de simulações, e uma aba Financeiro para lançar totais de receita/despesa por categoria e período com dashboard de DRE (KPIs, composição de custos em donut, comparação com período anterior).

O projeto já está em produção na Vercel. Pontos sensíveis: manter a fronteira correta entre `domain` e `infrastructure`, lembrar que o banco de produção não vem do Docker, reconstruir as imagens Docker locais quando precisar ver mudanças recentes, manter o regex de SPA fallback do `vercel.json` sincronizado com as rotas do React Router, e manter `Sidebar.tsx`/`Topbar.tsx`/`FinanceLayout.tsx` sincronizados manualmente (não compartilham a lista de navegação).
