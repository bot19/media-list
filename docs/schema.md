# Schema overview

Source of truth: `supabase/migrations/20261116120000_media_items.sql`  
Seed: `supabase/seed.sql`

## Enum `media_type`

`movie` | `tv` | `asian_drama` | `anime`

## Table `public.media_items`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE |
| `media_type` | `media_type` | required |
| `canonical_title` | `text` | required |
| `year` | `integer` | nullable |
| `genre` | `text` | nullable |
| `poster_url` | `text` | nullable |
| `source_ratings` | `jsonb` | default `{}` (e.g. `{ "imdb": 8.6 }`) |
| `source_urls` | `jsonb` | default `{}` |
| `user_rating` | `numeric(3,1)` | null or 0–10 |
| `comments` | `text` | nullable |
| `created_at` | `timestamptz` | UTC default now |
| `updated_at` | `timestamptz` | maintained by trigger |

Indexes on `user_id`, `media_type`, `canonical_title`.

## RLS

Enabled on `media_items`. Policies for `authenticated`:

- **select / update / delete** — `auth.uid() = user_id`
- **insert** — `with check (auth.uid() = user_id)`

The browser uses the **anon** key + user JWT only. Do not expose the service role to the SPA.

## Seed fixtures

- Demo user `11111111-1111-1111-1111-111111111111` → four titles (movie, tv, asian_drama, anime)
- Alt user `22222222-2222-2222-2222-222222222222` → one movie (must not appear when logged in as demo)

Password for both seed emails: `password123`.
