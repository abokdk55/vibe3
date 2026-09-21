-- Schema for the landing-page MVP items table.
-- Run this in the Supabase SQL editor or via Supabase migrations.

create extension if not exists "pgcrypto";

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  author_id uuid null references auth.users (id) on delete set null,
  tag text not null,
  title text not null,
  region text not null default '전국/온라인',
  event_date date null,
  level text not null,
  hours text not null,
  summary text not null,
  details text[] not null default '{}',
  detail_url text null,
  status text not null default 'active' check (status in ('draft', 'active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items
  add column if not exists author_id uuid null references auth.users (id) on delete set null,
  add column if not exists region text not null default '전국/온라인',
  add column if not exists event_date date null,
  add column if not exists updated_at timestamptz not null default now();

comment on table public.items is 'Public curriculum/listing items for the upgraded landing-page MVP.';
comment on column public.items.author_id is 'Nullable owner id. Authenticated write policies only allow the matching user to write their own rows.';
comment on column public.items.region is 'Region shown on list cards, such as Seoul, Busan, or online.';
comment on column public.items.event_date is 'Date shown on list cards. Null means the schedule is undecided.';
comment on column public.items.details is 'Detailed learning points shown on item detail pages.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

create or replace function public.set_items_author_id()
returns trigger
language plpgsql
as $$
begin
  if new.author_id is null then
    new.author_id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_items_author_id on public.items;
create trigger set_items_author_id
before insert on public.items
for each row
execute function public.set_items_author_id();

alter table public.items enable row level security;

drop policy if exists "Anyone can read items" on public.items;
create policy "Anyone can read items"
on public.items
for select
using (true);

drop policy if exists "Authenticated users can insert own items" on public.items;
create policy "Authenticated users can insert own items"
on public.items
for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "Authenticated users can update own items" on public.items;
create policy "Authenticated users can update own items"
on public.items
for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "Authenticated users can delete own items" on public.items;
create policy "Authenticated users can delete own items"
on public.items
for delete
to authenticated
using (author_id = auth.uid());

create index if not exists items_author_id_idx on public.items (author_id);
create index if not exists items_event_date_idx on public.items (event_date);
create index if not exists items_status_created_at_idx on public.items (status, created_at desc);
