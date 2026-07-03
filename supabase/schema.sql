-- PagodeFin — schema inicial
-- Seguro rodar mais de uma vez (idempotente). Rode este script inteiro no
-- Supabase Dashboard: SQL Editor > New query

create extension if not exists pgcrypto;

-- ── Grupos (bandas) ─────────────────────────────────────────
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default '#FF169B',
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'Membro',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ── Músicos ─────────────────────────────────────────────────
create table if not exists musicos (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  instrument text not null default '',
  role text not null default 'Freelancer',
  phone text not null default '',
  pix text not null default '',
  created_at timestamptz not null default now()
);

-- ── Eventos ─────────────────────────────────────────────────
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  contractor_name text not null,
  date date not null,
  time text not null default '20:00',
  location text not null default '',
  location_link text not null default '',
  total_value_cents bigint not null default 0,
  status text not null default 'A receber',
  operational_expenses_cents bigint not null default 0,
  band_fund_cents bigint not null default 0,
  is_band_fund_auto boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists custom_expenses (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  name text not null default '',
  cents bigint not null default 0
);

create table if not exists scheduled_musicians (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  musician_id uuid not null references musicos(id) on delete cascade,
  fee_override_cents bigint not null default 0,
  other_expenses_cents bigint not null default 0,
  payment_status text not null default 'Pendente',
  paid_via_team boolean not null default false
);

-- Migração p/ bancos já existentes (create table if not exists não adiciona colunas):
alter table scheduled_musicians add column if not exists paid_via_team boolean not null default false;

-- ── Caixa (extrato) ─────────────────────────────────────────
create table if not exists transacoes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  description text not null,
  amount_cents bigint not null,
  type text not null,
  category text not null,
  date date not null,
  created_at timestamptz not null default now()
);

-- ── Contratos ───────────────────────────────────────────────
create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  event_id uuid references eventos(id) on delete set null,
  sequence_number int not null,
  contractor_name text not null,
  event_date date not null,
  total_value_cents bigint not null default 0,
  issued_at date not null default current_date
);

create table if not exists clausulas (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  label text not null,
  is_on boolean not null default true,
  position int not null default 0
);

-- ── Helper: usuário pertence ao grupo? ──────────────────────
create or replace function is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────
alter table groups enable row level security;
alter table group_members enable row level security;
alter table musicos enable row level security;
alter table eventos enable row level security;
alter table custom_expenses enable row level security;
alter table scheduled_musicians enable row level security;
alter table transacoes enable row level security;
alter table contratos enable row level security;
alter table clausulas enable row level security;

drop policy if exists "members can view their groups" on groups;
create policy "members can view their groups" on groups
  for select using (is_group_member(id));

drop policy if exists "authenticated users can create groups" on groups;
create policy "authenticated users can create groups" on groups
  for insert with check (auth.uid() is not null);

drop policy if exists "members can update their groups" on groups;
create policy "members can update their groups" on groups
  for update using (is_group_member(id));

drop policy if exists "members can view group membership" on group_members;
create policy "members can view group membership" on group_members
  for select using (user_id = auth.uid() or is_group_member(group_id));

drop policy if exists "users can add themselves to a group" on group_members;
create policy "users can add themselves to a group" on group_members
  for insert with check (user_id = auth.uid());

drop policy if exists "group members manage musicos" on musicos;
create policy "group members manage musicos" on musicos
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "group members manage eventos" on eventos;
create policy "group members manage eventos" on eventos
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "group members manage transacoes" on transacoes;
create policy "group members manage transacoes" on transacoes
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "group members manage contratos" on contratos;
create policy "group members manage contratos" on contratos
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "group members manage clausulas" on clausulas;
create policy "group members manage clausulas" on clausulas
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "group members manage custom_expenses" on custom_expenses;
create policy "group members manage custom_expenses" on custom_expenses
  for all using (
    exists (select 1 from eventos e where e.id = evento_id and is_group_member(e.group_id))
  ) with check (
    exists (select 1 from eventos e where e.id = evento_id and is_group_member(e.group_id))
  );

drop policy if exists "group members manage scheduled_musicians" on scheduled_musicians;
create policy "group members manage scheduled_musicians" on scheduled_musicians
  for all using (
    exists (select 1 from eventos e where e.id = evento_id and is_group_member(e.group_id))
  ) with check (
    exists (select 1 from eventos e where e.id = evento_id and is_group_member(e.group_id))
  );
