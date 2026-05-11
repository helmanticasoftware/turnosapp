create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'Usuario',
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'basic' check (plan in ('basic', 'premium', 'business')),
  contract_hours_per_month integer not null default 160 check (contract_hours_per_month between 0 and 744),
  dark_mode boolean not null default true,
  show_holidays boolean not null default true,
  day_banks jsonb not null default '{"vacation":22,"personal":2,"comp":0}'::jsonb,
  notifications jsonb not null default '{"nextShift":true,"weekly":true,"monthly":true}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.calendars (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6366F1',
  shifts jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  events jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.custom_shifts (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  shift_key text not null,
  label text not null,
  short text not null,
  color text not null,
  bg text not null,
  icon text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, shift_key)
);

create table public.companies (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  max_employees integer not null default 30 check (max_employees between 1 and 30),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.company_members (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  role text not null default 'employee' check (role in ('owner', 'manager', 'employee')),
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, user_id)
);

create table public.work_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, name)
);

create table public.work_group_members (
  id uuid primary key default extensions.gen_random_uuid(),
  work_group_id uuid not null references public.work_groups(id) on delete cascade,
  company_member_id uuid not null references public.company_members(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (work_group_id, company_member_id)
);

create table public.swap_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_name text not null,
  calendar_id uuid references public.calendars(id) on delete set null,
  date_key date not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.share_links (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  code text not null unique,
  is_active boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'revenuecat',
  product_id text,
  plan_id text not null default 'basic' check (plan_id in ('basic', 'premium', 'business')),
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
  entitlement text,
  current_period_ends_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, provider)
);

create table public.devices (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web')),
  expo_push_token text not null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (expo_push_token)
);

create index calendars_owner_updated_idx on public.calendars (owner_id, updated_at desc);
create index custom_shifts_owner_idx on public.custom_shifts (owner_id, updated_at desc);
create index companies_owner_updated_idx on public.companies (owner_user_id, updated_at desc);
create index company_members_company_idx on public.company_members (company_id, role);
create index company_members_user_idx on public.company_members (user_id);
create index work_groups_company_idx on public.work_groups (company_id, updated_at desc);
create index swap_requests_company_idx on public.swap_requests (company_id, created_at desc);
create index swap_requests_requester_idx on public.swap_requests (requester_user_id, created_at desc);
create index share_links_owner_idx on public.share_links (owner_user_id, created_at desc);
create index subscriptions_user_idx on public.subscriptions (user_id, updated_at desc);
create index devices_user_idx on public.devices (user_id, updated_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1), 'Usuario')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = target_company_id
      and c.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = target_company_id
      and c.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'manager')
  );
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();
create trigger calendars_set_updated_at before update on public.calendars for each row execute function public.set_updated_at();
create trigger custom_shifts_set_updated_at before update on public.custom_shifts for each row execute function public.set_updated_at();
create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger company_members_set_updated_at before update on public.company_members for each row execute function public.set_updated_at();
create trigger work_groups_set_updated_at before update on public.work_groups for each row execute function public.set_updated_at();
create trigger swap_requests_set_updated_at before update on public.swap_requests for each row execute function public.set_updated_at();
create trigger share_links_set_updated_at before update on public.share_links for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger devices_set_updated_at before update on public.devices for each row execute function public.set_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_company_member(uuid) from public, anon, authenticated;
revoke execute on function public.is_company_admin(uuid) from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.calendars enable row level security;
alter table public.custom_shifts enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.work_groups enable row level security;
alter table public.work_group_members enable row level security;
alter table public.swap_requests enable row level security;
alter table public.share_links enable row level security;
alter table public.subscriptions enable row level security;
alter table public.devices enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "user_settings_select_own" on public.user_settings for select to authenticated using (user_id = auth.uid());
create policy "user_settings_insert_own" on public.user_settings for insert to authenticated with check (user_id = auth.uid());
create policy "user_settings_update_own" on public.user_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "calendars_select_own" on public.calendars for select to authenticated using (owner_id = auth.uid());
create policy "calendars_insert_own" on public.calendars for insert to authenticated with check (owner_id = auth.uid());
create policy "calendars_update_own" on public.calendars for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "calendars_delete_own" on public.calendars for delete to authenticated using (owner_id = auth.uid());

create policy "custom_shifts_select_own" on public.custom_shifts for select to authenticated using (owner_id = auth.uid());
create policy "custom_shifts_insert_own" on public.custom_shifts for insert to authenticated with check (owner_id = auth.uid());
create policy "custom_shifts_update_own" on public.custom_shifts for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "custom_shifts_delete_own" on public.custom_shifts for delete to authenticated using (owner_id = auth.uid());

create policy "companies_select_member_or_owner" on public.companies for select to authenticated using (public.is_company_member(id));
create policy "companies_insert_owner" on public.companies for insert to authenticated with check (owner_user_id = auth.uid());
create policy "companies_update_admin" on public.companies for update to authenticated using (public.is_company_admin(id)) with check (public.is_company_admin(id));
create policy "companies_delete_owner" on public.companies for delete to authenticated using (owner_user_id = auth.uid());

create policy "company_members_select_member_or_owner" on public.company_members for select to authenticated using (public.is_company_member(company_id));
create policy "company_members_insert_admin" on public.company_members for insert to authenticated with check (public.is_company_admin(company_id));
create policy "company_members_update_admin" on public.company_members for update to authenticated using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));
create policy "company_members_delete_admin" on public.company_members for delete to authenticated using (public.is_company_admin(company_id));

create policy "work_groups_select_member_or_owner" on public.work_groups for select to authenticated using (public.is_company_member(company_id));
create policy "work_groups_insert_admin" on public.work_groups for insert to authenticated with check (public.is_company_admin(company_id) and created_by = auth.uid());
create policy "work_groups_update_admin" on public.work_groups for update to authenticated using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));
create policy "work_groups_delete_admin" on public.work_groups for delete to authenticated using (public.is_company_admin(company_id));

create policy "work_group_members_select_member_or_owner" on public.work_group_members for select to authenticated using (
  exists (
    select 1
    from public.work_groups wg
    where wg.id = work_group_members.work_group_id
      and public.is_company_member(wg.company_id)
  )
);
create policy "work_group_members_insert_admin" on public.work_group_members for insert to authenticated with check (
  exists (
    select 1
    from public.work_groups wg
    where wg.id = work_group_members.work_group_id
      and public.is_company_admin(wg.company_id)
  )
);
create policy "work_group_members_delete_admin" on public.work_group_members for delete to authenticated using (
  exists (
    select 1
    from public.work_groups wg
    where wg.id = work_group_members.work_group_id
      and public.is_company_admin(wg.company_id)
  )
);

create policy "swap_requests_select_member_or_owner" on public.swap_requests for select to authenticated using (public.is_company_member(company_id));
create policy "swap_requests_insert_member" on public.swap_requests for insert to authenticated with check (requester_user_id = auth.uid() and public.is_company_member(company_id));
create policy "swap_requests_update_admin" on public.swap_requests for update to authenticated using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));
create policy "swap_requests_delete_admin_or_requester" on public.swap_requests for delete to authenticated using (public.is_company_admin(company_id) or requester_user_id = auth.uid());

create policy "share_links_select_own" on public.share_links for select to authenticated using (owner_user_id = auth.uid());
create policy "share_links_insert_own" on public.share_links for insert to authenticated with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.calendars c
    where c.id = share_links.calendar_id
      and c.owner_id = auth.uid()
  )
);
create policy "share_links_update_own" on public.share_links for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "share_links_delete_own" on public.share_links for delete to authenticated using (owner_user_id = auth.uid());

create policy "subscriptions_select_own" on public.subscriptions for select to authenticated using (user_id = auth.uid());

create policy "devices_select_own" on public.devices for select to authenticated using (user_id = auth.uid());
create policy "devices_insert_own" on public.devices for insert to authenticated with check (user_id = auth.uid());
create policy "devices_update_own" on public.devices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "devices_delete_own" on public.devices for delete to authenticated using (user_id = auth.uid());
