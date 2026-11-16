# Media List

Thin SPA for a personal media tracker: list items from Supabase, enrich new titles via a Netlify function, then save your rating and comments.

## Stack

| Layer | Choice |
| --- | --- |
| Client | Vite + React (SPA), Netlify hosting |
| Backend | Supabase Auth + Postgres |
| Enrichment | `netlify/functions/enrich` (LLM + web sources, mock fallback) |

**Local backend preference:** Docker Desktop + `supabase start` for auth/DB/seed.  
**Deploy target:** Netlify frontend + hosted Supabase project.

## Quick local test (auth + list/add)

Requires **Docker Desktop** running.

```bash
npm install
npx supabase start          # or: npm run supabase:start
npx supabase status -o env  # copy API URL + anon key
cp .env.example .env.local
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from status output
npm run supabase:reset      # applies migrations + seed.sql
npm run dev                 # http://127.0.0.1:5173
```

Sign in with the seed user:

- Email: `demo@media-list.local`
- Password: `password123`

You should see four demo rows. Use **Add media → Search / enrich** (mock mode without API keys) → confirm → save.

Optional Netlify-local functions runner (same Vite app on port 8888):

```bash
npm run dev:netlify
```

`npm run dev` already mounts `/api/enrich` via a Vite middleware so enrichment works without Netlify CLI.

## Media types & enrichment sources

| Type | Preferred sources |
| --- | --- |
| Movie / TV / Asian drama | IMDb (via OMDb) first, TMDB backup |
| Anime | MyAnimeList (Jikan public API) + AniDB links |

If live keys are missing or sources fail/time out, the function returns **labeled mock** candidates (`mode: "mock"`).

## Environment variables

### Client (`.env.local` / Netlify build env)

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Local: `http://127.0.0.1:54321`. Hosted: `https://PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | yes | Anon/public key from `supabase status` or hosted project settings |

### Enrichment function (Netlify function env / shell)

| Variable | Required | Notes |
| --- | --- | --- |
| `OMDB_API_KEY` | no | IMDb proxy for movie/TV/asian drama |
| `TMDB_API_KEY` | no | TMDB backup |
| `OPENAI_API_KEY` | no | Optional LLM refine of live candidates |
| `OPENAI_MODEL` | no | Default `gpt-4o-mini` |
| `ANIDB_CLIENT` | no | Reserved; without it AniDB is link-only |

No enrichment secrets are required for a local demo.

### Hosted secrets checklist (Netlify)

Set at least:

1. `VITE_SUPABASE_URL`
2. `VITE_SUPABASE_ANON_KEY`

Optionally add enrichment keys above for live lookups in production.

## Supabase schema

Migration: `supabase/migrations/20261116120000_media_items.sql`

`media_items` columns: `media_type`, `canonical_title`, `year`, `genre`, `poster_url`, `source_ratings`, `source_urls`, `user_rating`, `comments`, timestamps, `user_id`, with RLS so users only see their rows.

Seed: `supabase/seed.sql` (demo + alt users, sample titles).

## Deploy sketch

1. Create a hosted Supabase project; run the same migration (SQL editor or `supabase db push` after linking).
2. Connect the GitHub repo to Netlify; publish directory `dist`, build `npm run build`.
3. Set Netlify env vars listed above.
4. Point Supabase Auth redirect URLs at your Netlify site URL.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite SPA + local `/api/enrich` |
| `npm run dev:netlify` | Netlify Dev (functions + SPA) |
| `npm run build` | Production build |
| `npm run supabase:start` / `stop` / `status` / `reset` | Local Supabase lifecycle |
