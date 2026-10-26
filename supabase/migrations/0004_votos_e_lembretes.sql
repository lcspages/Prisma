-- Prisma: encerrar batalha por votos e lembretes (notificações) diários.
--   * Batalhas: cada participante pode pedir para encerrar; termina quando pelo menos
--     1/3 dos participantes pediu (1 contra 1: qualquer um dos dois encerra).
--   * Notificações: aparelhos inscritos (push) e funções para salvar e para o envio diário.

alter table public.battle_players add column if not exists end_vote boolean not null default false;

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
                   'myEndVote', me.end_vote,
                   'endVotes', (select count(*) from public.battle_players v where v.battle_id = bt.id and v.status = 'aceito' and v.end_vote),
                   'endNeeded', greatest(1, ceil((select count(*) from public.battle_players v where v.battle_id = bt.id and v.status = 'aceito') / 3.0))::int,
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
  v_total int;
  v_votes int;
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
      if v_category not in ('geral', 'estudo', 'trabalho', 'treino', 'alimentacao', 'sono', 'pessoal') then v_err := 'Categoria inválida.'; exit acao; end if;
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

    when 'encerrar-batalha' then
      -- Cada participante vota; a batalha termina quando 1/3 dos participantes votou
      -- (no 1 contra 1, um voto basta).
      v_battle := (v_args ->> 'battle')::uuid;
      if not exists (
        select 1 from public.battles b join public.battle_players me on me.battle_id = b.id
         where b.id = v_battle and me.user_id = p_user and me.status = 'aceito' and not b.canceled and b.ends_at > now()
           and exists (select 1 from public.battle_players o where o.battle_id = b.id and o.user_id <> b.created_by and o.status = 'aceito')
      ) then
        v_err := 'Essa batalha não está em andamento.'; exit acao;
      end if;
      update public.battle_players set end_vote = true where battle_id = v_battle and user_id = p_user;
      select count(*), count(*) filter (where end_vote) into v_total, v_votes
        from public.battle_players where battle_id = v_battle and status = 'aceito';
      if v_votes * 3 >= v_total then
        update public.battles b set ends_at = greatest(now(), b.starts_at + interval '1 second') where b.id = v_battle;
      end if;

    when 'manter-batalha' then
      v_battle := (v_args ->> 'battle')::uuid;
      update public.battle_players bp set end_vote = false
       where bp.battle_id = v_battle and bp.user_id = p_user
         and exists (select 1 from public.battles b where b.id = v_battle and not b.canceled and b.ends_at > now());

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

-- Notificações ---------------------------------------------------------------------
-- Um aparelho por linha (endereço do push + chaves). "manha" e "noite" = quais lembretes receber.
create table if not exists public.push_subscriptions (
  endpoint text primary key check (char_length(endpoint) between 10 and 1000 and endpoint like 'https://%'),
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  manha boolean not null default true,
  noite boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
-- Último dia em que cada lembrete saiu (o envio repetido no mesmo dia não manda de novo).
alter table public.push_subscriptions add column if not exists sent_manha date;
alter table public.push_subscriptions add column if not exists sent_noite date;
alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;

-- p_action: 'salvar' {endpoint, p256dh, auth, manha, noite}, 'remover' {endpoint}, 'estado' {endpoint}.
-- Devolve o aparelho (ou null se não está inscrito).
create or replace function public.prisma_push(p_secret text, p_user uuid, p_action text, p_args jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_endpoint text := coalesce(p_args ->> 'endpoint', '');
  v_count int;
begin
  perform private.check_secret(p_secret);
  if p_user is null then raise exception 'usuário ausente'; end if;
  if p_action = 'salvar' then
    select count(*) into v_count from public.push_subscriptions s where s.user_id = p_user and s.endpoint <> v_endpoint;
    if v_count >= 10 then
      -- Limite de 10 aparelhos: sai o mais antigo.
      delete from public.push_subscriptions s
       where s.endpoint = (select x.endpoint from public.push_subscriptions x where x.user_id = p_user order by x.updated_at limit 1);
    end if;
    insert into public.push_subscriptions as s (endpoint, user_id, p256dh, auth, manha, noite)
    values (v_endpoint, p_user, p_args ->> 'p256dh', p_args ->> 'auth',
            coalesce((p_args ->> 'manha')::boolean, true), coalesce((p_args ->> 'noite')::boolean, true))
    on conflict (endpoint) do update
      set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
          manha = excluded.manha, noite = excluded.noite, updated_at = now();
  elsif p_action = 'remover' then
    delete from public.push_subscriptions s where s.endpoint = v_endpoint and s.user_id = p_user;
    return 'null'::jsonb;
  elsif p_action <> 'estado' then
    raise exception 'ação desconhecida';
  end if;
  return (select jsonb_build_object('endpoint', s.endpoint, 'manha', s.manha, 'noite', s.noite)
            from public.push_subscriptions s where s.endpoint = v_endpoint and s.user_id = p_user);
end $$;

-- Para o envio diário: aparelhos de quem tem assinatura valendo, com o que importa do dia.
-- p_turno: 'manha' ou 'noite'. p_today: data (fuso de Brasília). Cada aparelho sai uma vez
-- por dia e turno: chamar de novo no mesmo dia não devolve quem já recebeu.
create or replace function public.prisma_push_targets(p_secret text, p_turno text, p_today date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_out jsonb;
begin
  perform private.check_secret(p_secret);
  if p_turno not in ('manha', 'noite') then raise exception 'turno inválido'; end if;
  with due as (
    update public.push_subscriptions s
       set sent_manha = case when p_turno = 'manha' then p_today else s.sent_manha end,
           sent_noite = case when p_turno = 'noite' then p_today else s.sent_noite end
     where (case when p_turno = 'manha' then s.manha and s.sent_manha is distinct from p_today
                 else s.noite and s.sent_noite is distinct from p_today end)
       and exists (select 1 from auth.users u join public.subscriptions a on a.email = lower(u.email)
                    where u.id = s.user_id and a.status in ('ativa', 'atrasada', 'cancelada')
                      and (a.valid_until is null or a.valid_until > now()))
    returning s.endpoint, s.p256dh, s.auth, s.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth, 'user', d.user_id,
           'name', (select e.data ->> 'displayName' from public.entities e where e.user_id = d.user_id and e.collection = 'profile' limit 1),
           'tasks', coalesce((
             select jsonb_agg(jsonb_build_object('title', t.data ->> 'title', 'dueDate', t.data ->> 'dueDate', 'time', t.data ->> 'scheduledTime'))
               from (select e.data from public.entities e
                      where e.user_id = d.user_id and e.collection = 'tasks'
                        and e.data ->> 'completedAt' is null
                        and e.data ->> 'dueDate' is not null and e.data ->> 'dueDate' <= to_char(p_today, 'YYYY-MM-DD')
                      order by e.data ->> 'dueDate' desc, coalesce(e.data ->> 'scheduledTime', '99:99')
                      limit 50) t), '[]'::jsonb),
           'habits', coalesce((
             select jsonb_agg(jsonb_build_object('name', e.data ->> 'name', 'done', coalesce(e.data -> 'checks', '[]'::jsonb) ? to_char(p_today, 'YYYY-MM-DD')))
               from public.entities e
              where e.user_id = d.user_id and e.collection = 'habits'
                and (jsonb_typeof(e.data -> 'days') is distinct from 'array' or jsonb_array_length(e.data -> 'days') = 0
                     or e.data -> 'days' @> to_jsonb(extract(dow from p_today)::int))), '[]'::jsonb))), '[]'::jsonb)
    into v_out
    from due d;
  return v_out;
end $$;

-- Aparelho que não existe mais (o serviço de push respondeu 404/410).
create or replace function public.prisma_push_gone(p_secret text, p_endpoint text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  delete from public.push_subscriptions where endpoint = p_endpoint;
end $$;

revoke all on function public.prisma_push(text, uuid, text, jsonb) from public, authenticated;
revoke all on function public.prisma_push_targets(text, text, date) from public, authenticated;
revoke all on function public.prisma_push_gone(text, text) from public, authenticated;
grant execute on function public.prisma_push(text, uuid, text, jsonb) to anon;
grant execute on function public.prisma_push_targets(text, text, date) to anon;
grant execute on function public.prisma_push_gone(text, text) to anon;
