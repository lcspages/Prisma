-- Prisma: amigos, grupos e batalhas de pontos
--
-- Como funciona:
--   * Cada cliente ganha um código de amigo (6 letras/números) para ser adicionado.
--   * Amizade: pedido → aceito. Grupos: quem cria convida amigos, que aceitam ou não.
--   * Batalha: contra um amigo ou um grupo, numa categoria (geral, estudo, trabalho,
--     treino ou pessoal), por 1 a 30 dias. Vence quem fizer mais pontos no período.
--   * Os pontos vêm dos registros de XP que o próprio app grava (public.entities,
--     coleção xpEvents), com a hora do servidor e a categoria do módulo.
--     Para ninguém trapacear, cada pessoa soma no máximo 400 pontos por dia na batalha.
--   * Amigos só veem nome, código e pontos. Nada de tarefas, hábitos ou anotações.
--   * Tudo passa pela função public.prisma_social, que exige a chave do servidor.

-- Perfis públicos (código de amigo) -------------------------------------------
create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pendente', 'aceita')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee on public.friendships (addressee);

create table if not exists public.social_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  owner uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.social_group_members (
  group_id uuid not null references public.social_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('convidado', 'membro')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists social_group_members_user on public.social_group_members (user_id);

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  group_id uuid references public.social_groups (id) on delete set null,
  group_name text,
  category text not null check (category in ('geral', 'estudo', 'trabalho', 'treino', 'pessoal')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  canceled boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.battle_players (
  battle_id uuid not null references public.battles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('convidado', 'aceito', 'recusado')),
  primary key (battle_id, user_id)
);
create index if not exists battle_players_user on public.battle_players (user_id);

-- Busca rápida dos pontos por pessoa e horário.
create index if not exists entities_xp_at on public.entities (user_id, ((data ->> 'at')))
  where collection = 'xpEvents';

alter table public.social_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.social_groups enable row level security;
alter table public.social_group_members enable row level security;
alter table public.battles enable row level security;
alter table public.battle_players enable row level security;
revoke all on table public.social_profiles, public.friendships, public.social_groups,
  public.social_group_members, public.battles, public.battle_players from anon, authenticated;

-- Auxiliares (privadas) ---------------------------------------------------------

-- Nome que a pessoa usa no app (do perfil dela).
create or replace function private.display_name(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select nullif(trim(e.data ->> 'displayName'), '')
      from public.entities e
     where e.user_id = p_user and e.collection = 'profile' and e.id = 'me'), 'Sem nome')
$$;

create or replace function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
     where f.status = 'aceita'
       and least(f.requester, f.addressee) = least(a, b)
       and greatest(f.requester, f.addressee) = greatest(a, b))
$$;

-- Pontos de uma pessoa num período e categoria, com limite de 400 por dia.
-- Hábitos só contam se o dia marcado for do período da batalha.
create or replace function private.battle_points(p_user uuid, p_start timestamptz, p_end timestamptz, p_category text) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(least(t.total, 400)), 0)::int
    from (
      select ((x.at) at time zone 'America/Sao_Paulo')::date as d, sum(x.amount) as total
        from (
          select (e.data ->> 'at')::timestamptz as at,
                 greatest(coalesce((e.data ->> 'amount')::int, 0), 0) as amount,
                 e.data ->> 'area' as area,
                 e.data ->> 'source' as source,
                 e.data ->> 'day' as day
            from public.entities e
           where e.user_id = p_user and e.collection = 'xpEvents'
             and (e.data ->> 'at') >= to_char(p_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
        ) x
       where x.at >= p_start and x.at < p_end
         and (p_category = 'geral' or x.area = p_category)
         and (x.source is distinct from 'habit' or x.day is null
              or x.day >= to_char((p_start at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD'))
       group by 1
    ) t
$$;

create or replace function private.new_friend_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_code text; v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  loop
    select string_agg(substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from public.social_profiles p where p.code = v_code);
  end loop;
  return v_code;
end $$;

revoke all on function private.display_name(uuid), private.are_friends(uuid, uuid),
  private.battle_points(uuid, timestamptz, timestamptz, text), private.new_friend_code() from public, anon, authenticated;

-- Tudo o que a pessoa vê na tela de Amigos.
create or replace function private.social_state(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_now timestamptz := now();
begin
  return jsonb_build_object(
    'me', (select jsonb_build_object('id', p.user_id, 'code', p.code, 'name', private.display_name(p.user_id))
             from public.social_profiles p where p.user_id = p_user),
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.uid, 'name', private.display_name(o.uid), 'code', sp.code) order by lower(private.display_name(o.uid)))
        from (select case when f.requester = p_user then f.addressee else f.requester end as uid
                from public.friendships f
               where f.status = 'aceita' and p_user in (f.requester, f.addressee)) o
        left join public.social_profiles sp on sp.user_id = o.uid), '[]'::jsonb),
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'userId', f.requester, 'name', private.display_name(f.requester), 'code', sp.code, 'at', f.created_at) order by f.created_at desc)
        from public.friendships f left join public.social_profiles sp on sp.user_id = f.requester
       where f.status = 'pendente' and f.addressee = p_user), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'userId', f.addressee, 'name', private.display_name(f.addressee), 'code', sp.code, 'at', f.created_at) order by f.created_at desc)
        from public.friendships f left join public.social_profiles sp on sp.user_id = f.addressee
       where f.status = 'pendente' and f.requester = p_user), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.id, 'name', g.name, 'mine', g.owner = p_user, 'status', m.status,
               'members', (select jsonb_agg(jsonb_build_object('id', gm.user_id, 'name', private.display_name(gm.user_id), 'status', gm.status)
                                            order by gm.status desc, gm.created_at)
                             from public.social_group_members gm where gm.group_id = g.id))
             order by m.status, g.created_at desc)
        from public.social_group_members m join public.social_groups g on g.id = m.group_id
       where m.user_id = p_user), '[]'::jsonb),
    'battles', coalesce((
      select jsonb_agg(b.obj order by b.sort_key, b.ends_at desc)
        from (
          select bt.ends_at,
                 case when bt.canceled or bt.ends_at <= v_now then 2 when me.status = 'convidado' then 0 else 1 end as sort_key,
                 jsonb_build_object(
                   'id', bt.id, 'category', bt.category, 'startsAt', bt.starts_at, 'endsAt', bt.ends_at,
                   'group', case when bt.group_name is null then null else jsonb_build_object('id', bt.group_id, 'name', bt.group_name) end,
                   'createdBy', jsonb_build_object('id', bt.created_by, 'name', private.display_name(bt.created_by)),
                   'mine', bt.created_by = p_user,
                   'myStatus', me.status,
                   'status', case
                     when bt.canceled then 'cancelada'
                     when bt.ends_at <= v_now and not exists (select 1 from public.battle_players o where o.battle_id = bt.id and o.user_id <> bt.created_by and o.status = 'aceito') then 'expirada'
                     when bt.ends_at <= v_now then 'encerrada'
                     when exists (select 1 from public.battle_players o where o.battle_id = bt.id and o.user_id <> bt.created_by and o.status = 'aceito') then 'ativa'
                     else 'pendente' end,
                   'players', (
                     select jsonb_agg(jsonb_build_object(
                              'id', bp.user_id, 'name', private.display_name(bp.user_id), 'status', bp.status,
                              'points', case when bp.status = 'aceito' and not bt.canceled
                                             then private.battle_points(bp.user_id, bt.starts_at, least(bt.ends_at, v_now), bt.category) end)
                            order by bp.status = 'aceito' desc, bp.user_id = bt.created_by desc)
                       from public.battle_players bp where bp.battle_id = bt.id and bp.status <> 'recusado'))
                   as obj
            from public.battle_players me join public.battles bt on bt.id = me.battle_id
           where me.user_id = p_user and me.status <> 'recusado'
             and bt.ends_at > v_now - interval '30 days'
           order by bt.ends_at desc
           limit 40
        ) b), '[]'::jsonb)
  );
end $$;
revoke all on function private.social_state(uuid) from public, anon, authenticated;

-- Função usada pelo servidor -----------------------------------------------------
-- p_action: 'estado', 'adicionar', 'responder-amigo', 'remover-amigo', 'criar-grupo',
-- 'responder-grupo', 'convidar-grupo', 'sair-grupo', 'criar-batalha', 'responder-batalha',
-- 'cancelar-batalha'. Devolve {state} ou {error, state}.
create or replace function public.prisma_social(p_secret text, p_user uuid, p_action text, p_args jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_args jsonb := coalesce(p_args, '{}'::jsonb);
  v_other uuid;
  v_row record;
  v_group uuid;
  v_battle uuid;
  v_count int;
  v_users uuid[];
  v_days int;
  v_category text;
  v_err text;
begin
  perform private.check_secret(p_secret);
  if p_user is null then raise exception 'usuário ausente'; end if;

  if not exists (select 1 from public.social_profiles p where p.user_id = p_user) then
    insert into public.social_profiles (user_id, code) values (p_user, private.new_friend_code())
    on conflict (user_id) do nothing;
  end if;

  <<acao>>
  begin
    case p_action
    when 'estado' then
      null;

    when 'adicionar' then
      select p.user_id into v_other from public.social_profiles p where p.code = upper(trim(coalesce(v_args ->> 'code', '')));
      if v_other is null then v_err := 'Código não encontrado. Confira as letras e os números.'; exit acao; end if;
      if v_other = p_user then v_err := 'Esse é o seu próprio código.'; exit acao; end if;
      select * into v_row from public.friendships f
       where least(f.requester, f.addressee) = least(p_user, v_other) and greatest(f.requester, f.addressee) = greatest(p_user, v_other);
      if found then
        if v_row.status = 'aceita' then v_err := 'Vocês já são amigos.'; exit acao; end if;
        if v_row.requester = p_user then v_err := 'Pedido já enviado. Agora é só esperar a resposta.'; exit acao; end if;
        update public.friendships set status = 'aceita' where id = v_row.id; -- a outra pessoa já tinha pedido
        exit acao;
      end if;
      select count(*) into v_count from public.friendships f where f.requester = p_user and f.status = 'pendente';
      if v_count >= 30 then v_err := 'Você tem muitos pedidos esperando resposta.'; exit acao; end if;
      select count(*) into v_count from public.friendships f where f.status = 'aceita' and p_user in (f.requester, f.addressee);
      if v_count >= 200 then v_err := 'Limite de 200 amigos atingido.'; exit acao; end if;
      insert into public.friendships (requester, addressee, status) values (p_user, v_other, 'pendente');

    when 'responder-amigo' then
      if coalesce((v_args ->> 'accept')::boolean, false) then
        update public.friendships set status = 'aceita'
         where id = (v_args ->> 'id')::bigint and addressee = p_user and status = 'pendente';
      else
        delete from public.friendships
         where id = (v_args ->> 'id')::bigint and p_user in (requester, addressee) and status = 'pendente';
      end if;

    when 'remover-amigo' then
      v_other := (v_args ->> 'user')::uuid;
      delete from public.friendships f
       where least(f.requester, f.addressee) = least(p_user, v_other) and greatest(f.requester, f.addressee) = greatest(p_user, v_other);

    when 'criar-grupo' then
      if char_length(trim(coalesce(v_args ->> 'name', ''))) not between 1 and 40 then
        v_err := 'Dê um nome de até 40 letras ao grupo.'; exit acao;
      end if;
      select count(*) into v_count from public.social_group_members m where m.user_id = p_user;
      if v_count >= 20 then v_err := 'Você já está em 20 grupos.'; exit acao; end if;
      select coalesce(array_agg(distinct u), '{}') into v_users
        from jsonb_array_elements_text(coalesce(v_args -> 'members', '[]'::jsonb)) j(u_text),
             lateral (select j.u_text::uuid as u) x
       where private.are_friends(p_user, x.u);
      if cardinality(v_users) = 0 then v_err := 'Escolha pelo menos um amigo para o grupo.'; exit acao; end if;
      if cardinality(v_users) > 29 then v_err := 'Um grupo pode ter até 30 pessoas.'; exit acao; end if;
      insert into public.social_groups (name, owner) values (trim(v_args ->> 'name'), p_user) returning id into v_group;
      insert into public.social_group_members (group_id, user_id, status) values (v_group, p_user, 'membro');
      insert into public.social_group_members (group_id, user_id, status) select v_group, unnest(v_users), 'convidado';

    when 'responder-grupo' then
      v_group := (v_args ->> 'group')::uuid;
      if coalesce((v_args ->> 'accept')::boolean, false) then
        update public.social_group_members set status = 'membro' where group_id = v_group and user_id = p_user and status = 'convidado';
      else
        delete from public.social_group_members where group_id = v_group and user_id = p_user and status = 'convidado';
      end if;

    when 'convidar-grupo' then
      v_group := (v_args ->> 'group')::uuid;
      if not exists (select 1 from public.social_group_members m where m.group_id = v_group and m.user_id = p_user and m.status = 'membro') then
        v_err := 'Você não está nesse grupo.'; exit acao;
      end if;
      select coalesce(array_agg(distinct x.u), '{}') into v_users
        from jsonb_array_elements_text(coalesce(v_args -> 'members', '[]'::jsonb)) j(u_text),
             lateral (select j.u_text::uuid as u) x
       where private.are_friends(p_user, x.u)
         and not exists (select 1 from public.social_group_members m where m.group_id = v_group and m.user_id = x.u);
      select count(*) into v_count from public.social_group_members m where m.group_id = v_group;
      if v_count + cardinality(v_users) > 30 then v_err := 'Um grupo pode ter até 30 pessoas.'; exit acao; end if;
      insert into public.social_group_members (group_id, user_id, status) select v_group, unnest(v_users), 'convidado';

    when 'sair-grupo' then
      v_group := (v_args ->> 'group')::uuid;
      delete from public.social_group_members where group_id = v_group and user_id = p_user;
      if not exists (select 1 from public.social_group_members m where m.group_id = v_group and m.status = 'membro') then
        delete from public.social_groups where id = v_group;
      elsif exists (select 1 from public.social_groups g where g.id = v_group and g.owner = p_user) then
        update public.social_groups set owner = (
          select m.user_id from public.social_group_members m where m.group_id = v_group and m.status = 'membro' order by m.created_at limit 1)
         where id = v_group;
      end if;

    when 'criar-batalha' then
      v_category := coalesce(v_args ->> 'category', 'geral');
      if v_category not in ('geral', 'estudo', 'trabalho', 'treino', 'pessoal') then v_err := 'Categoria inválida.'; exit acao; end if;
      v_days := coalesce((v_args ->> 'days')::int, 7);
      if v_days not in (1, 3, 7, 14, 30) then v_err := 'Duração inválida.'; exit acao; end if;
      select count(*) into v_count from public.battles b
       where b.created_by = p_user and not b.canceled and b.ends_at > now();
      if v_count >= 10 then v_err := 'Você já tem 10 batalhas em andamento.'; exit acao; end if;
      if v_args ? 'group' and nullif(v_args ->> 'group', '') is not null then
        v_group := (v_args ->> 'group')::uuid;
        if not exists (select 1 from public.social_group_members m where m.group_id = v_group and m.user_id = p_user and m.status = 'membro') then
          v_err := 'Você não está nesse grupo.'; exit acao;
        end if;
        select coalesce(array_agg(m.user_id), '{}') into v_users from public.social_group_members m
         where m.group_id = v_group and m.status = 'membro' and m.user_id <> p_user;
        if cardinality(v_users) = 0 then v_err := 'Ninguém do grupo entrou ainda. Espere aceitarem o convite.'; exit acao; end if;
      else
        v_other := nullif(v_args ->> 'opponent', '')::uuid;
        if v_other is null or not private.are_friends(p_user, v_other) then v_err := 'Escolha um amigo para desafiar.'; exit acao; end if;
        v_users := array[v_other];
      end if;
      insert into public.battles (created_by, group_id, group_name, category, starts_at, ends_at)
      values (p_user, v_group, (select g.name from public.social_groups g where g.id = v_group), v_category, now(), now() + make_interval(days => v_days))
      returning id into v_battle;
      insert into public.battle_players (battle_id, user_id, status) values (v_battle, p_user, 'aceito');
      insert into public.battle_players (battle_id, user_id, status) select v_battle, unnest(v_users), 'convidado';

    when 'responder-batalha' then
      v_battle := (v_args ->> 'battle')::uuid;
      update public.battle_players bp
         set status = case when coalesce((v_args ->> 'accept')::boolean, false) then 'aceito' else 'recusado' end
       where bp.battle_id = v_battle and bp.user_id = p_user and bp.status = 'convidado'
         and exists (select 1 from public.battles b where b.id = v_battle and not b.canceled and b.ends_at > now());

    when 'cancelar-batalha' then
      v_battle := (v_args ->> 'battle')::uuid;
      update public.battles b set canceled = true
       where b.id = v_battle and b.created_by = p_user and b.ends_at > now()
         and not exists (select 1 from public.battle_players o where o.battle_id = b.id and o.user_id <> p_user and o.status = 'aceito');
      if not found then v_err := 'Só dá para cancelar antes de alguém aceitar.'; exit acao; end if;

    else
      v_err := 'Ação desconhecida.';
    end case;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      v_err := 'Pedido inválido.';
  end;

  if v_err is not null then
    return jsonb_build_object('error', v_err, 'state', private.social_state(p_user));
  end if;
  return jsonb_build_object('state', private.social_state(p_user));
end $$;

revoke all on function public.prisma_social(text, uuid, text, jsonb) from public, authenticated;
grant execute on function public.prisma_social(text, uuid, text, jsonb) to anon;
