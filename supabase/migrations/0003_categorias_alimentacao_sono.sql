-- Prisma: categorias Alimentação e Sono nas batalhas.
-- Mesma lógica de antes; só a lista de categorias aceitas mudou.

alter table public.battles drop constraint if exists battles_category_check;
alter table public.battles add constraint battles_category_check
  check (category in ('geral', 'estudo', 'trabalho', 'treino', 'alimentacao', 'sono', 'pessoal'));

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
