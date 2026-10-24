-- Prisma: banco de dados (Supabase / Postgres)
--
-- Como funciona:
--   * Cada cliente tem uma conta no Supabase Auth (auth.users).
--   * Os dados do app (tarefas, hábitos, módulos…) ficam em public.entities,
--     um registro por item, sempre presos ao user_id do dono.
--   * Ninguém acessa as tabelas direto pela internet: o RLS está ligado e sem
--     regras de leitura. Só o servidor do Prisma lê e grava, pelas funções
--     prisma_* abaixo, que exigem a chave do servidor (APP_DB_SECRET).
--   * public.subscriptions diz quem pode usar o app (preenchida pela Kiwify).
--
-- Depois de rodar este arquivo, cadastre o hash da chave do servidor:
--   insert into private.config (key, value)
--   values ('server_secret_sha256', encode(sha256(convert_to('<APP_DB_SECRET>', 'UTF8')), 'hex'))
--   on conflict (key) do update set value = excluded.value;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.config (
  key text primary key,
  value text not null
);

-- Confere a chave do servidor (guardada só como hash).
create or replace function private.check_secret(p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_hash text;
begin
  select value into v_hash from private.config where key = 'server_secret_sha256';
  if v_hash is null or p_secret is null
     or encode(pg_catalog.sha256(convert_to(p_secret, 'UTF8')), 'hex') <> v_hash then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
end $$;
revoke all on function private.check_secret(text) from public, anon, authenticated;

-- Dados do app -----------------------------------------------------------------
create table if not exists public.entities (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection text not null check (collection in (
    'profile', 'modules', 'folders', 'tasks', 'notes', 'goals', 'habits', 'inbox',
    'focusSessions', 'xpEvents', 'exercises', 'exerciseLogs', 'trainingPlans')),
  id text not null check (char_length(id) between 1 and 100),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

-- Assinaturas ------------------------------------------------------------------
-- Uma linha por compra: assinatura (chave = id da assinatura na Kiwify) ou
-- compra única/vitalícia (chave = id do pedido). Linhas manuais (cortesia)
-- podem ser criadas pelo painel do Supabase só com e-mail, plano e status.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and position('@' in email) > 1),
  plan text not null check (plan in ('mensal', 'vitalicio', 'cortesia')),
  plan_name text,
  status text not null check (status in ('ativa', 'atrasada', 'cancelada', 'reembolsada', 'chargeback')),
  -- Até quando o acesso vale. Vazio = sem data para acabar (vitalício/cortesia).
  valid_until timestamptz,
  kiwify_subscription_id text unique,
  kiwify_order_id text,
  kiwify_product_id text,
  last_event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_email on public.subscriptions (email);
create unique index if not exists subscriptions_single_order on public.subscriptions (kiwify_order_id)
  where kiwify_subscription_id is null and kiwify_order_id is not null;

-- Avisos recebidos da Kiwify (evita processar o mesmo aviso duas vezes).
create table if not exists public.kiwify_events (
  order_id text not null,
  event text not null,
  result text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  primary key (order_id, event)
);

-- Tentativas de login erradas (o limite vale mesmo se o servidor reiniciar).
create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_key_at on public.login_attempts (key, at);

-- Nada disso é acessível direto pela internet.
alter table public.entities enable row level security;
alter table public.subscriptions enable row level security;
alter table public.kiwify_events enable row level security;
alter table public.login_attempts enable row level security;
revoke all on table public.entities, public.subscriptions, public.kiwify_events, public.login_attempts from anon, authenticated;

-- Funções usadas pelo servidor -------------------------------------------------

-- Situação de acesso de um e-mail.
create or replace function public.prisma_access(p_secret text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  perform private.check_secret(p_secret);
  select s.plan, s.status, s.valid_until into r
    from public.subscriptions s
   where s.email = lower(trim(p_email))
     and s.status in ('ativa', 'atrasada', 'cancelada')
     and (s.valid_until is null or s.valid_until > now())
   order by (s.valid_until is null) desc, s.valid_until desc
   limit 1;
  if found then
    return jsonb_build_object('active', true, 'plan', r.plan, 'status', r.status, 'validUntil', r.valid_until);
  end if;
  select s.plan, s.status, s.valid_until into r
    from public.subscriptions s
   where s.email = lower(trim(p_email))
   order by s.updated_at desc
   limit 1;
  if found then
    return jsonb_build_object('active', false, 'plan', r.plan, 'status', r.status, 'validUntil', r.valid_until);
  end if;
  return jsonb_build_object('active', false, 'status', 'nenhuma');
end $$;

-- Carrega os dados do cliente (só se a assinatura estiver valendo).
create or replace function public.prisma_load(p_secret text, p_user uuid, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_access jsonb;
begin
  v_access := public.prisma_access(p_secret, p_email);
  if not (v_access ->> 'active')::boolean then
    return jsonb_build_object('access', v_access);
  end if;
  return jsonb_build_object(
    'access', v_access,
    'items', coalesce(
      (select jsonb_agg(jsonb_build_array(e.collection, e.data)) from public.entities e where e.user_id = p_user),
      '[]'::jsonb));
end $$;

-- Grava o resultado de uma ação: remoções e depois inclusões/alterações.
-- p_upserts = [{"c": coleção, "id": id, "d": dados}], p_removes = [{"c": coleção, "id": id}]
create or replace function public.prisma_apply(p_secret text, p_user uuid, p_upserts jsonb, p_removes jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  if p_user is null then raise exception 'usuário ausente'; end if;

  delete from public.entities e
   using jsonb_array_elements(coalesce(p_removes, '[]'::jsonb)) r
   where e.user_id = p_user and e.collection = r ->> 'c' and e.id = r ->> 'id';

  insert into public.entities (user_id, collection, id, data, updated_at)
  select p_user, u ->> 'c', u ->> 'id', u -> 'd', now()
    from jsonb_array_elements(coalesce(p_upserts, '[]'::jsonb)) u
  on conflict (user_id, collection, id) do update set data = excluded.data, updated_at = now();

  if (select count(*) from public.entities e where e.user_id = p_user) > 100000 then
    raise exception 'limite de itens atingido';
  end if;
end $$;

-- Limite de tentativas: devolve quantos segundos faltam para liberar (0 = liberado).
create or replace function public.prisma_login_blocked(p_secret text, p_keys text[], p_max int, p_window_sec int) returns int
language plpgsql security definer set search_path = '' as $$
declare v_key text; v_at timestamptz; v_wait int := 0;
begin
  perform private.check_secret(p_secret);
  foreach v_key in array p_keys loop
    select a.at into v_at
      from public.login_attempts a
     where a.key = v_key and a.at > now() - make_interval(secs => p_window_sec)
     order by a.at desc
     offset greatest(p_max - 1, 0) limit 1;
    if found then
      v_wait := greatest(v_wait, ceil(extract(epoch from (v_at + make_interval(secs => p_window_sec) - now())))::int);
    end if;
  end loop;
  return greatest(v_wait, 0);
end $$;

create or replace function public.prisma_login_fail(p_secret text, p_keys text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  insert into public.login_attempts (key) select unnest(p_keys);
  delete from public.login_attempts where at < now() - interval '1 day';
end $$;

create or replace function public.prisma_login_ok(p_secret text, p_keys text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  delete from public.login_attempts where key = any (p_keys);
end $$;

-- Aplica um aviso da Kiwify. p_change (montado pelo servidor):
-- {email, plan, plan_name, status, valid_until, keep_until, subscription_id, order_id, product_id}
-- Devolve 'repetido', 'ignorado' ou 'aplicado'.
create or replace function public.prisma_kiwify(p_secret text, p_order_id text, p_event text, p_payload jsonb, p_change jsonb)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_sub text := nullif(p_change ->> 'subscription_id', '');
  v_until timestamptz := nullif(p_change ->> 'valid_until', '')::timestamptz;
  v_keep boolean := coalesce((p_change ->> 'keep_until')::boolean, false);
  v_status text := p_change ->> 'status';
begin
  perform private.check_secret(p_secret);

  insert into public.kiwify_events (order_id, event, payload, result)
  values (p_order_id, p_event, p_payload, case when p_change is null then 'ignorado' else 'aplicado' end)
  on conflict do nothing;
  if not found then return 'repetido'; end if;
  if p_change is null then return 'ignorado'; end if;

  if v_sub is not null then
    insert into public.subscriptions as s
      (email, plan, plan_name, status, valid_until, kiwify_subscription_id, kiwify_order_id, kiwify_product_id, last_event)
    values (p_change ->> 'email', p_change ->> 'plan', p_change ->> 'plan_name', v_status, v_until,
            v_sub, p_change ->> 'order_id', p_change ->> 'product_id', p_event)
    on conflict (kiwify_subscription_id) do update set
      email = excluded.email,
      plan_name = coalesce(excluded.plan_name, s.plan_name),
      -- Depois de reembolso ou chargeback, o aviso de cancelamento não devolve o acesso.
      status = case when s.status in ('reembolsada', 'chargeback') and excluded.status = 'cancelada' then s.status else excluded.status end,
      valid_until = case
        when s.status in ('reembolsada', 'chargeback') and excluded.status = 'cancelada' then s.valid_until
        when v_keep then s.valid_until
        else excluded.valid_until end,
      kiwify_order_id = coalesce(excluded.kiwify_order_id, s.kiwify_order_id),
      kiwify_product_id = coalesce(excluded.kiwify_product_id, s.kiwify_product_id),
      last_event = excluded.last_event,
      updated_at = now();
  else
    insert into public.subscriptions as s
      (email, plan, plan_name, status, valid_until, kiwify_order_id, kiwify_product_id, last_event)
    values (p_change ->> 'email', p_change ->> 'plan', p_change ->> 'plan_name', v_status, v_until,
            p_order_id, p_change ->> 'product_id', p_event)
    on conflict (kiwify_order_id) where kiwify_subscription_id is null and kiwify_order_id is not null
    do update set
      email = excluded.email,
      plan_name = coalesce(excluded.plan_name, s.plan_name),
      status = excluded.status,
      valid_until = case when v_keep then s.valid_until else excluded.valid_until end,
      kiwify_product_id = coalesce(excluded.kiwify_product_id, s.kiwify_product_id),
      last_event = excluded.last_event,
      updated_at = now();
  end if;
  return 'aplicado';
end $$;

-- O servidor chama as funções com a chave pública do projeto (papel "anon").
-- Sem a chave do servidor, todas recusam.
revoke all on function public.prisma_access(text, text) from public, authenticated;
revoke all on function public.prisma_load(text, uuid, text) from public, authenticated;
revoke all on function public.prisma_apply(text, uuid, jsonb, jsonb) from public, authenticated;
revoke all on function public.prisma_login_blocked(text, text[], int, int) from public, authenticated;
revoke all on function public.prisma_login_fail(text, text[]) from public, authenticated;
revoke all on function public.prisma_login_ok(text, text[]) from public, authenticated;
revoke all on function public.prisma_kiwify(text, text, text, jsonb, jsonb) from public, authenticated;
grant execute on function public.prisma_access(text, text) to anon;
grant execute on function public.prisma_load(text, uuid, text) to anon;
grant execute on function public.prisma_apply(text, uuid, jsonb, jsonb) to anon;
grant execute on function public.prisma_login_blocked(text, text[], int, int) to anon;
grant execute on function public.prisma_login_fail(text, text[]) to anon;
grant execute on function public.prisma_login_ok(text, text[]) to anon;
grant execute on function public.prisma_kiwify(text, text, text, jsonb, jsonb) to anon;
