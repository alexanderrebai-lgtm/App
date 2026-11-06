-- Élan : synchronisation et partage de profils (Supabase, projet hébergé dans l'UE).
-- À exécuter une fois dans l'éditeur SQL du projet. Toutes les tables sont protégées par RLS :
-- chacun ne voit que ses profils et ceux qu'on lui a partagés.

create table if not exists public.profile_snapshot (
  profile_id text primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_member (
  profile_id text not null references public.profile_snapshot (profile_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('read', 'edit')),
  primary key (profile_id, user_id)
);

create table if not exists public.profile_invite (
  code text primary key,
  profile_id text not null references public.profile_snapshot (profile_id) on delete cascade,
  role text not null check (role in ('read', 'edit')),
  created_by uuid not null default auth.uid(),
  expires_at timestamptz not null default now() + interval '7 days'
);

alter table public.profile_snapshot enable row level security;
alter table public.profile_member enable row level security;
alter table public.profile_invite enable row level security;

create or replace function public.is_member(p text, editor boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profile_member m
    where m.profile_id = p and m.user_id = auth.uid() and (not editor or m.role = 'edit')
  );
$$;

create policy "lire ses profils et ceux partagés" on public.profile_snapshot for select
  using (owner_id = auth.uid() or public.is_member(profile_id, false));
create policy "créer ses profils" on public.profile_snapshot for insert
  with check (owner_id = auth.uid());
create policy "modifier ses profils ou en co-édition" on public.profile_snapshot for update
  using (owner_id = auth.uid() or public.is_member(profile_id, true));

-- personne ne peut changer le propriétaire d'un profil
create or replace function public.keep_owner() returns trigger language plpgsql as $$
begin
  if new.owner_id <> old.owner_id then raise exception 'Le propriétaire d’un profil ne change pas'; end if;
  return new;
end $$;
drop trigger if exists keep_owner on public.profile_snapshot;
create trigger keep_owner before update on public.profile_snapshot for each row execute function public.keep_owner();
create policy "supprimer ses profils" on public.profile_snapshot for delete
  using (owner_id = auth.uid());

create policy "voir les partages qui me concernent" on public.profile_member for select
  using (user_id = auth.uid() or exists (select 1 from public.profile_snapshot s where s.profile_id = profile_member.profile_id and s.owner_id = auth.uid()));
create policy "retirer un partage" on public.profile_member for delete
  using (user_id = auth.uid() or exists (select 1 from public.profile_snapshot s where s.profile_id = profile_member.profile_id and s.owner_id = auth.uid()));

create policy "voir mes invitations" on public.profile_invite for select using (created_by = auth.uid());

-- Invitation : seul le propriétaire du profil peut en créer une (code de 8 caractères, valable 7 jours).
create or replace function public.create_invite(p_profile text, p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not exists (select 1 from profile_snapshot where profile_id = p_profile and owner_id = auth.uid()) then
    raise exception 'Seul le propriétaire peut partager ce profil';
  end if;
  if p_role not in ('read', 'edit') then raise exception 'Rôle invalide'; end if;
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into profile_invite (code, profile_id, role) values (c, p_profile, p_role);
  return c;
end $$;

-- Accepter une invitation : usage unique.
create or replace function public.redeem_invite(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare i profile_invite;
begin
  select * into i from profile_invite where code = p_code and expires_at > now();
  if not found then raise exception 'Code invalide ou expiré'; end if;
  insert into profile_member (profile_id, user_id, role) values (i.profile_id, auth.uid(), i.role)
    on conflict (profile_id, user_id) do update set role = excluded.role;
  delete from profile_invite where code = p_code;
  return i.profile_id;
end $$;

revoke all on function public.create_invite(text, text) from anon;
revoke all on function public.redeem_invite(text) from anon;

-- Droits par défaut de Supabase trop larges : TRUNCATE ignore les règles RLS, et les visiteurs
-- non connectés (anon) n'ont rien à faire ici. On ne garde que lecture, ajout, modification
-- et suppression pour les utilisateurs connectés, toujours filtrées par les règles ci-dessus.
revoke all on public.profile_snapshot, public.profile_member, public.profile_invite from anon;
revoke truncate, references, trigger on public.profile_snapshot, public.profile_member, public.profile_invite from authenticated;
revoke insert, update on public.profile_member, public.profile_invite from authenticated;
revoke delete on public.profile_invite from authenticated;
