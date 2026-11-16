-- Media List schema: per-user media items with enrichment metadata + personal notes.

create extension if not exists "pgcrypto";

create type public.media_type as enum (
  'movie',
  'tv',
  'asian_drama',
  'anime'
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_type public.media_type not null,
  canonical_title text not null,
  year integer,
  genre text,
  poster_url text,
  source_ratings jsonb not null default '{}'::jsonb,
  source_urls jsonb not null default '{}'::jsonb,
  user_rating numeric(3, 1) check (
    user_rating is null
    or (user_rating >= 0 and user_rating <= 10)
  ),
  comments text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index media_items_user_id_idx on public.media_items (user_id);
create index media_items_media_type_idx on public.media_items (media_type);
create index media_items_canonical_title_idx on public.media_items (canonical_title);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger media_items_set_updated_at
before update on public.media_items
for each row
execute function public.set_updated_at();

alter table public.media_items enable row level security;

create policy "Users can select own media items"
  on public.media_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own media items"
  on public.media_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own media items"
  on public.media_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own media items"
  on public.media_items
  for delete
  to authenticated
  using (auth.uid() = user_id);
