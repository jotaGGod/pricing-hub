create extension if not exists pgcrypto;

create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null unique,
    password_hash text null,
    google_id text null unique,
    avatar_url text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    refresh_token_hash text not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz null,
    created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_sessions_refresh_token_hash on sessions(refresh_token_hash);

create table if not exists user_preferences (
    user_id uuid primary key references users(id) on delete cascade,
    theme text not null default 'dark' check (theme in ('dark', 'light')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists marketplace_channels (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    description text not null default '',
    enabled boolean not null default true,
    fee_rules_json jsonb not null,
    last_verified_at date null,
    source_note text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists products (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    title text not null,
    cost_cents bigint not null check (cost_cents >= 0),
    default_channel_code text null references marketplace_channels(code),
    category text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_products_user_id on products(user_id);

create table if not exists pricing_simulations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    product_id uuid null references products(id) on delete set null,
    title text not null,
    channel_code text not null references marketplace_channels(code),
    input_json jsonb not null,
    result_json jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_pricing_simulations_user_id on pricing_simulations(user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists trg_user_preferences_updated_at on user_preferences;
create trigger trg_user_preferences_updated_at
before update on user_preferences
for each row execute function set_updated_at();

drop trigger if exists trg_marketplace_channels_updated_at on marketplace_channels;
create trigger trg_marketplace_channels_updated_at
before update on marketplace_channels
for each row execute function set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();
