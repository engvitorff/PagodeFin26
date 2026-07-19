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
  evento_id uuid references eventos(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Migração p/ bancos já existentes:
alter table transacoes add column if not exists evento_id uuid references eventos(id) on delete set null;
-- Extrato por músico de transações agregadas (ex.: "Pagamento equipe"): [{ name, instrument, cents }]
alter table transacoes add column if not exists line_items jsonb;

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
set search_path = public, extensions
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- ── Helper: usuário é Admin do grupo? ───────────────────────
-- Usado pelas policies abaixo: só Admin lê/escreve nas tabelas operacionais.
-- Papel "View" (músico com acesso restrito) nunca passa por essas policies —
-- só recebe dados via get_my_agenda()/get_my_musico() (security definer).
create or replace function is_group_admin(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public, extensions
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and role = 'Admin'
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

-- Antes só exigia is_group_member (sem WITH CHECK, então a mesma expressão
-- USING valia como CHECK) — qualquer membro, inclusive 'View', conseguia
-- alterar name/brand/password_hash direto na tabela. Agora só Admin.
drop policy if exists "members can update their groups" on groups;
drop policy if exists "admins can update their groups" on groups;
create policy "admins can update their groups" on groups
  for update using (is_group_admin(id)) with check (is_group_admin(id));

-- Antes usava is_group_member, então qualquer 'View' lia role de todo mundo
-- no grupo direto pela tabela (bypassando o gate "só Admin" de
-- list_group_members()). Cada um sempre enxerga a própria linha; ver as dos
-- outros agora exige ser Admin.
drop policy if exists "members can view group membership" on group_members;
create policy "members can view group membership" on group_members
  for select using (user_id = auth.uid() or is_group_admin(group_id));

-- Removida de propósito (sem recriar): permitia `insert into group_members
-- (group_id, user_id, role) values (<qualquer-group-id-conhecido>,
-- auth.uid(), 'Admin')` direto pelo cliente, sem senha nem promote_to_admin
-- — qualquer usuário autenticado virava Admin de qualquer grupo cujo UUID
-- soubesse. A partir de agora TODA escrita em group_members passa por uma
-- função security definer (create_group, join_group, promote_to_admin),
-- nunca por insert direto do cliente.
drop policy if exists "users can add themselves to a group" on group_members;

-- A partir da introdução do papel "View" (músicos com acesso restrito à própria
-- agenda), estas 7 tabelas passam a exigir Admin para qualquer leitura/escrita
-- direta. Um usuário View nunca lê essas tabelas pelo cliente Supabase —
-- ele só recebe dados através de `get_my_agenda()` (security definer), que
-- devolve apenas o que é dele. Isso evita que inspecionar a rede exponha
-- valores de outros músicos ou do evento inteiro.
drop policy if exists "group members manage musicos" on musicos;
drop policy if exists "admins manage musicos" on musicos;
create policy "admins manage musicos" on musicos
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

drop policy if exists "group members manage eventos" on eventos;
drop policy if exists "admins manage eventos" on eventos;
create policy "admins manage eventos" on eventos
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

drop policy if exists "group members manage transacoes" on transacoes;
drop policy if exists "admins manage transacoes" on transacoes;
create policy "admins manage transacoes" on transacoes
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

drop policy if exists "group members manage contratos" on contratos;
drop policy if exists "admins manage contratos" on contratos;
create policy "admins manage contratos" on contratos
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

drop policy if exists "group members manage clausulas" on clausulas;
drop policy if exists "admins manage clausulas" on clausulas;
create policy "admins manage clausulas" on clausulas
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

drop policy if exists "group members manage custom_expenses" on custom_expenses;
drop policy if exists "admins manage custom_expenses" on custom_expenses;
create policy "admins manage custom_expenses" on custom_expenses
  for all using (
    exists (select 1 from eventos e where e.id = evento_id and is_group_admin(e.group_id))
  ) with check (
    exists (select 1 from eventos e where e.id = evento_id and is_group_admin(e.group_id))
  );

drop policy if exists "group members manage scheduled_musicians" on scheduled_musicians;
drop policy if exists "admins manage scheduled_musicians" on scheduled_musicians;
create policy "admins manage scheduled_musicians" on scheduled_musicians
  for all using (
    exists (select 1 from eventos e where e.id = evento_id and is_group_admin(e.group_id))
  ) with check (
    -- Além de exigir Admin do grupo do evento, garante que o músico
    -- escalado pertence ao MESMO grupo do evento (evita escalar um músico
    -- de outro grupo por engano/UUID adivinhado, o que corromperia o
    -- cálculo do borderô daquele evento).
    exists (
      select 1 from eventos e
      join musicos m on m.id = musician_id
      where e.id = evento_id and is_group_admin(e.group_id) and m.group_id = e.group_id
    )
  );

-- ── Login de grupo (nome + senha) ────────────────────────────
-- Permite que um usuário com conta pessoal já criada entre em um grupo
-- existente (em vez de sempre criar um grupo novo no onboarding).
-- A senha nunca é lida pelo cliente: só é verificada dentro da função
-- abaixo (security definer), que roda com privilégios que ignoram a RLS
-- de "groups" para poder localizar o grupo mesmo sem o usuário ainda
-- ser membro (situação de "chicken-and-egg" antes de entrar).
alter table groups add column if not exists password_hash text;

-- A senha mora numa tabela separada, com RLS habilitada e SEM NENHUMA
-- policy — isso nega acesso a authenticated/anon por padrão. Só funções
-- security definer (dono da tabela) leem/escrevem aqui. Testado ao vivo:
-- um REVOKE de coluna em groups.password_hash NÃO bastava, porque o
-- Supabase já concede SELECT na tabela inteira por padrão pro role
-- authenticated, e Postgres não deixa restringir uma coluna quando já
-- existe grant de tabela — um usuário 'View' ainda conseguia ler o hash
-- direto via REST. Tabela própria sem policy é a forma correta.
create table if not exists group_secrets (
  group_id uuid primary key references groups(id) on delete cascade,
  password_hash text not null
);
alter table group_secrets enable row level security;

insert into group_secrets (group_id, password_hash)
select id, password_hash from groups where password_hash is not null and password_hash <> ''
on conflict (group_id) do update set password_hash = excluded.password_hash;

drop index if exists groups_name_lower_joinable_unique;
alter table groups drop column if exists password_hash;

create or replace function join_group(p_name text, p_password text)
returns table (id uuid, name text, brand text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_group_id uuid;
  v_group_name text;
  v_group_brand text;
  v_password_hash text;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'Nome ou senha do grupo inválidos.';
  end if;
  if p_password is null or length(p_password) < 4 then
    raise exception 'Nome ou senha do grupo inválidos.';
  end if;

  -- O join com group_secrets já filtra pra só grupos joináveis (com senha).
  select g.id, g.name, g.brand, gs.password_hash
    into v_group_id, v_group_name, v_group_brand, v_password_hash
  from groups g
  join group_secrets gs on gs.group_id = g.id
  where lower(g.name) = lower(trim(p_name))
  order by g.created_at asc
  limit 1;

  -- As checagens abaixo usam a MESMA mensagem de propósito: mensagens
  -- diferentes ("não encontrado" vs "sem senha" vs "senha incorreta")
  -- funcionam como oráculo pra enumerar nomes de grupo existentes.
  if v_group_id is null or v_password_hash is null then
    raise exception 'Nome ou senha do grupo inválidos.';
  end if;

  if crypt(p_password, v_password_hash) <> v_password_hash then
    raise exception 'Nome ou senha do grupo inválidos.';
  end if;

  -- 'View': acesso restrito por padrão (só a própria agenda, depois de um
  -- Admin vincular a conta a um músico do elenco). Um Admin pode promover
  -- a Admin depois, pela tela de Config (ver promote_to_admin).
  insert into group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'View')
  on conflict (group_id, user_id) do nothing;

  return query select v_group_id, v_group_name, v_group_brand;
end;
$$;

grant execute on function join_group(text, text) to authenticated;

create or replace function set_group_password(p_group_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text;
begin
  if not is_group_admin(p_group_id) then
    raise exception 'Só um admin do grupo pode alterar a senha.';
  end if;
  if p_password is null or length(p_password) < 4 then
    raise exception 'Senha do grupo precisa ter pelo menos 4 caracteres.';
  end if;

  select name into v_name from groups where id = p_group_id;

  if exists (
    select 1 from groups g
    join group_secrets gs on gs.group_id = g.id
    where lower(g.name) = lower(v_name) and g.id <> p_group_id
  ) then
    raise exception 'Já existe outro grupo com esse nome usando login por senha. Renomeie o grupo antes de definir uma senha.';
  end if;

  insert into group_secrets (group_id, password_hash)
  values (p_group_id, crypt(p_password, gen_salt('bf')))
  on conflict (group_id) do update set password_hash = excluded.password_hash;
end;
$$;

grant execute on function set_group_password(uuid, text) to authenticated;

-- Rótulo antigo -> novo (papel único não-admin agora é 'View', com acesso
-- restrito à própria agenda). Idempotente: na segunda execução não encontra
-- mais nenhuma linha 'Membro' para atualizar.
update group_members set role = 'View' where role = 'Membro';

-- ── Múltiplos admins + músico "View" vinculado à própria conta ──────
-- Um músico (ex.: freelancer que só toca, não administra) faz login normal
-- e entra no grupo (join_group acima), mas fica em 'View' sem nenhum dado
-- visível até um Admin vincular essa conta a um registro em `musicos`
-- (link_musico). A partir daí, get_my_agenda() devolve só os shows dele e
-- seu valor líquido — nunca o faturamento total do evento nem o valor dos
-- outros músicos.
alter table musicos add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists musicos_user_id_unique on musicos (user_id) where user_id is not null;

create or replace function promote_to_admin(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id from group_members where user_id = auth.uid() and role = 'Admin' limit 1;
  if v_group_id is null then
    raise exception 'Só um admin pode promover outros membros.';
  end if;

  update group_members set role = 'Admin'
  where group_id = v_group_id and user_id = p_target_user_id;

  if not found then
    raise exception 'Usuário não encontrado neste grupo.';
  end if;
end;
$$;

grant execute on function promote_to_admin(uuid) to authenticated;

-- Lista os membros do grupo do Admin que chama, com e-mail (via auth.users,
-- só acessível aqui dentro por ser security definer) e o músico vinculado,
-- se houver. Usado na tela de Config para promover admins e mostrar vínculos.
create or replace function list_group_members()
returns table (user_id uuid, email text, role text, musico_id uuid, musico_name text)
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare
  v_group_id uuid;
begin
  select gm.group_id into v_group_id from group_members gm where gm.user_id = auth.uid() and gm.role = 'Admin' limit 1;
  if v_group_id is null then
    raise exception 'Só um admin pode ver a lista de membros.';
  end if;

  return query
  select gm.user_id, u.email::text, gm.role, m.id as musico_id, m.name as musico_name
  from group_members gm
  join auth.users u on u.id = gm.user_id
  left join musicos m on m.user_id = gm.user_id and m.group_id = v_group_id
  where gm.group_id = v_group_id
  order by (gm.role = 'Admin') desc, u.email;
end;
$$;

grant execute on function list_group_members() to authenticated;

create or replace function link_musico(p_musico_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id from musicos where id = p_musico_id;
  if v_group_id is null or not is_group_admin(v_group_id) then
    raise exception 'Só um admin do grupo pode vincular músicos.';
  end if;
  if not exists (select 1 from group_members where group_id = v_group_id and user_id = p_user_id) then
    raise exception 'Esse usuário não é membro deste grupo.';
  end if;

  begin
    update musicos set user_id = p_user_id where id = p_musico_id;
  exception when unique_violation then
    raise exception 'Esse usuário já está vinculado a outro músico. Desvincule primeiro.';
  end;
end;
$$;

grant execute on function link_musico(uuid, uuid) to authenticated;

create or replace function unlink_musico(p_musico_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id from musicos where id = p_musico_id;
  if v_group_id is null or not is_group_admin(v_group_id) then
    raise exception 'Só um admin do grupo pode desvincular músicos.';
  end if;

  update musicos set user_id = null where id = p_musico_id;
end;
$$;

grant execute on function unlink_musico(uuid) to authenticated;

-- Músico vinculado à conta que está chamando (ou nenhuma linha, se ainda
-- não foi vinculado por um Admin).
create or replace function get_my_musico()
returns table (id uuid, name text, instrument text, role text)
language sql
security definer
stable
set search_path = public, extensions
as $$
  select m.id, m.name, m.instrument, m.role
  from musicos m
  where m.user_id = auth.uid()
  limit 1;
$$;

grant execute on function get_my_musico() to authenticated;

-- Agenda pessoal do músico vinculado à conta que está chamando: data,
-- horário, local, contratante, o valor LÍQUIDO dele naquele show (mesma
-- fórmula do calcBordero em src/lib/calc.ts — cota do sócio já dividida
-- entre custos fixos e freelancers, ou o cachê individual do freelancer,
-- ambos menos vales/despesas) e o status de pagamento. Nunca devolve o
-- faturamento do evento nem o valor de outros músicos.
create or replace function get_my_agenda()
returns table (
  evento_id uuid,
  event_date date,
  event_time text,
  location text,
  location_link text,
  contractor_name text,
  meu_valor_cents bigint,
  payment_status text
)
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare
  v_musico_id uuid;
  v_musico_role text;
  v_group_id uuid;
begin
  select m.id, m.role, m.group_id into v_musico_id, v_musico_role, v_group_id
  from musicos m where m.user_id = auth.uid() limit 1;

  if v_musico_id is null then
    return;
  end if;

  return query
  with custom_totals as (
    select ce.evento_id, sum(ce.cents) as total
    from custom_expenses ce
    join eventos e on e.id = ce.evento_id
    where e.group_id = v_group_id
    group by ce.evento_id
  ),
  freelancer_totals as (
    select sm.evento_id, sum(greatest(0, sm.fee_override_cents - sm.other_expenses_cents)) as total
    from scheduled_musicians sm
    join musicos m on m.id = sm.musician_id
    where m.group_id = v_group_id and m.role = 'Freelancer'
    group by sm.evento_id
  ),
  socio_counts as (
    select sm.evento_id, count(*) as total
    from scheduled_musicians sm
    join musicos m on m.id = sm.musician_id
    where m.group_id = v_group_id and m.role = 'Sócio'
    group by sm.evento_id
  ),
  lucro_calc as (
    select
      e.id as evento_id,
      (e.total_value_cents - e.operational_expenses_cents - coalesce(ct.total, 0) - coalesce(ft.total, 0))::numeric as lucro,
      coalesce(sc.total, 0) as num_socios,
      e.band_fund_mode,
      e.band_fund_cents,
      e.band_fund_percent,
      e.band_fund_percent_base,
      e.total_value_cents
    from eventos e
    left join custom_totals ct on ct.evento_id = e.id
    left join freelancer_totals ft on ft.evento_id = e.id
    left join socio_counts sc on sc.evento_id = e.id
    where e.group_id = v_group_id
  ),
  -- Mesma lógica de calcBordero (src/lib/calc.ts): Auto reparte o lucro
  -- entre sócios + banda; Manual/Percentual primeiro reservam o caixa da
  -- banda (fixo ou % da Venda/Saldo Rateio) e dividem o resto só entre sócios.
  bordero as (
    select
      lc.evento_id,
      case
        when lc.band_fund_mode = 'auto' then floor(lc.lucro / (lc.num_socios + 1))
        when lc.num_socios > 0 then
          floor(
            (lc.lucro - (
              case
                when lc.band_fund_mode = 'percentual' then
                  floor(
                    (case when lc.band_fund_percent_base = 'venda' then lc.total_value_cents else lc.lucro end)::numeric
                    * coalesce(lc.band_fund_percent, 0) / 100
                  )
                else lc.band_fund_cents
              end
            )) / lc.num_socios
          )
        else 0
      end as cota_socio
    from lucro_calc lc
  )
  select
    e.id,
    e.date,
    e.time,
    e.location,
    e.location_link,
    e.contractor_name,
    (case
      when v_musico_role = 'Sócio' then greatest(0, greatest(0, b.cota_socio) - sm.other_expenses_cents)
      else greatest(0, sm.fee_override_cents - sm.other_expenses_cents)
    end)::bigint as meu_valor_cents,
    sm.payment_status
  from scheduled_musicians sm
  join eventos e on e.id = sm.evento_id
  join bordero b on b.evento_id = e.id
  where sm.musician_id = v_musico_id and e.group_id = v_group_id
  order by e.date desc;
end;
$$;

grant execute on function get_my_agenda() to authenticated;

-- Relatório pessoal do músico vinculado à conta que está chamando: mesmo
-- escopo de dados que get_my_agenda(), mas com bruto/descontos separados
-- (em vez de já líquido) e o status do evento (A receber/Recebido), pra
-- alimentar os filtros e totais da tela de Relatório sem nunca expor
-- faturamento do evento nem valor de outros músicos.
create or replace function get_my_relatorio()
returns table (
  evento_id uuid,
  event_date date,
  event_status text,
  contractor_name text,
  bruto_cents bigint,
  descontos_cents bigint,
  payment_status text
)
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare
  v_musico_id uuid;
  v_musico_role text;
  v_group_id uuid;
begin
  select m.id, m.role, m.group_id into v_musico_id, v_musico_role, v_group_id
  from musicos m where m.user_id = auth.uid() limit 1;

  if v_musico_id is null then
    return;
  end if;

  return query
  with custom_totals as (
    select ce.evento_id, sum(ce.cents) as total
    from custom_expenses ce
    join eventos e on e.id = ce.evento_id
    where e.group_id = v_group_id
    group by ce.evento_id
  ),
  freelancer_totals as (
    select sm.evento_id, sum(greatest(0, sm.fee_override_cents - sm.other_expenses_cents)) as total
    from scheduled_musicians sm
    join musicos m on m.id = sm.musician_id
    where m.group_id = v_group_id and m.role = 'Freelancer'
    group by sm.evento_id
  ),
  socio_counts as (
    select sm.evento_id, count(*) as total
    from scheduled_musicians sm
    join musicos m on m.id = sm.musician_id
    where m.group_id = v_group_id and m.role = 'Sócio'
    group by sm.evento_id
  ),
  lucro_calc as (
    select
      e.id as evento_id,
      (e.total_value_cents - e.operational_expenses_cents - coalesce(ct.total, 0) - coalesce(ft.total, 0))::numeric as lucro,
      coalesce(sc.total, 0) as num_socios,
      e.band_fund_mode,
      e.band_fund_cents,
      e.band_fund_percent,
      e.band_fund_percent_base,
      e.total_value_cents
    from eventos e
    left join custom_totals ct on ct.evento_id = e.id
    left join freelancer_totals ft on ft.evento_id = e.id
    left join socio_counts sc on sc.evento_id = e.id
    where e.group_id = v_group_id
  ),
  bordero as (
    select
      lc.evento_id,
      case
        when lc.band_fund_mode = 'auto' then floor(lc.lucro / (lc.num_socios + 1))
        when lc.num_socios > 0 then
          floor(
            (lc.lucro - (
              case
                when lc.band_fund_mode = 'percentual' then
                  floor(
                    (case when lc.band_fund_percent_base = 'venda' then lc.total_value_cents else lc.lucro end)::numeric
                    * coalesce(lc.band_fund_percent, 0) / 100
                  )
                else lc.band_fund_cents
              end
            )) / lc.num_socios
          )
        else 0
      end as cota_socio
    from lucro_calc lc
  )
  select
    e.id,
    e.date,
    e.status,
    e.contractor_name,
    (case when v_musico_role = 'Sócio' then greatest(0, b.cota_socio) else sm.fee_override_cents end)::bigint as bruto_cents,
    sm.other_expenses_cents::bigint as descontos_cents,
    sm.payment_status
  from scheduled_musicians sm
  join eventos e on e.id = sm.evento_id
  join bordero b on b.evento_id = e.id
  where sm.musician_id = v_musico_id and e.group_id = v_group_id
  order by e.date desc;
end;
$$;

grant execute on function get_my_relatorio() to authenticated;

-- ── Correções de segurança (revisão adversarial) ─────────────
-- (a exposição de password_hash foi corrigida acima, movendo a coluna pra
-- tabela group_secrets — um REVOKE de coluna sozinho não bastava.)

-- create_group(): substitui os dois inserts diretos que existiam no
-- cliente (groups + group_members com role='Admin'). Antes disso, a policy
-- de insert em group_members só checava user_id=auth.uid() sem checar
-- role nem group_id — qualquer usuário autenticado podia se auto-inserir
-- como 'Admin' de QUALQUER grupo cujo UUID soubesse, sem senha nenhuma.
-- Agora a única forma de virar Admin de um grupo é: (a) criar o grupo
-- (aqui, você vira Admin do seu próprio grupo novo) ou (b) ser promovido
-- por um Admin existente (promote_to_admin). A policy de insert direto em
-- group_members foi removida (ver acima) — não existe mais.
create or replace function create_group(p_name text, p_brand text)
returns table (id uuid, name text, brand text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_group_id uuid;
  v_name text;
  v_brand text;
begin
  if auth.uid() is null then
    raise exception 'Você precisa estar logado para criar um grupo.';
  end if;

  v_name := coalesce(nullif(trim(p_name), ''), 'Meu grupo');
  v_brand := coalesce(nullif(trim(p_brand), ''), '#FF169B');
  v_group_id := gen_random_uuid();

  insert into groups (id, name, brand) values (v_group_id, v_name, v_brand);
  insert into group_members (group_id, user_id, role) values (v_group_id, auth.uid(), 'Admin');

  return query select v_group_id, v_name, v_brand;
end;
$$;

grant execute on function create_group(text, text) to authenticated;

-- ── Caixa (Fundo): 3º modo de cálculo (percentual) ───────────
-- Além de Auto (divide o saldo em partes iguais entre os sócios + banda) e
-- Manual (valor fixo digitado), agora existe "percentual": um % de "Venda"
-- (total_value_cents) ou "Saldo Rateio" (o lucro depois de custos/
-- freelancers, antes da divisão entre sócios). Substitui is_band_fund_auto
-- (boolean) por um modo com 3 valores; a leitura é sempre dinâmica (o app
-- recalcula band_fund_cents a partir de band_fund_percent/_base toda vez
-- que o evento é aberto, igual o Auto já fazia).
alter table eventos add column if not exists band_fund_mode text not null default 'auto';
alter table eventos add column if not exists band_fund_percent numeric;
alter table eventos add column if not exists band_fund_percent_base text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'eventos' and column_name = 'is_band_fund_auto'
  ) then
    update eventos set band_fund_mode = 'manual' where is_band_fund_auto = false;
  end if;
end $$;

alter table eventos drop column if exists is_band_fund_auto;
