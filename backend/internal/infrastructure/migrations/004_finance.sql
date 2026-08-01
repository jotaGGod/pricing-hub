create table if not exists finance_categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    kind text not null check (kind in ('income', 'expense')),
    icon text not null default 'circle-dollar-sign',
    description text null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, name)
);

create index if not exists idx_finance_categories_user_id on finance_categories(user_id);

create table if not exists finance_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    category_id uuid not null references finance_categories(id) on delete restrict,
    kind text not null check (kind in ('income', 'expense')),
    amount_cents bigint not null check (amount_cents >= 0),
    description text null,
    period_start date not null,
    period_end date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (period_end >= period_start)
);

create index if not exists idx_finance_transactions_user_id on finance_transactions(user_id);
create index if not exists idx_finance_transactions_period on finance_transactions(user_id, period_start, period_end);

drop trigger if exists trg_finance_categories_updated_at on finance_categories;
create trigger trg_finance_categories_updated_at
before update on finance_categories
for each row execute function set_updated_at();

drop trigger if exists trg_finance_transactions_updated_at on finance_transactions;
create trigger trg_finance_transactions_updated_at
before update on finance_transactions
for each row execute function set_updated_at();
