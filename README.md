# Media List

Personal media tracker SPA: sign in, list your titles from Supabase, enrich a new title via a Netlify function, then save your rating and comments.

| Layer | Choice |
| --- | --- |
| Client | Vite + React SPA → Netlify |
| Backend | Supabase Auth + Postgres |
| Enrichment | `netlify/functions/enrich` (sources + optional LLM; labeled mock fallback) |

**Local BE:** Docker Desktop + `supabase start` (preferred for development).  
**Deploy target:** Netlify + hosted Supabase.

More detail: [`docs/`](./docs/) · agent guidance: [`AGENTS.md`](./AGENTS.md)

## Quick start (local)

Requires **Docker Desktop** running.

```bash
npm install
npm run supabase:start
npx supabase status -o env   # note API_URL + ANON_KEY
cp .env.example .env.local
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from status
npm run supabase:reset       # migrations + seed
npm run dev                  # http://127.0.0.1:5173
```

### Demo login (seed)

| Field | Value |
| --- | --- |
| Email | `demo@media-list.local` |
| Password | `password123` |

You should see four seeded items for that user. Use **Add media → Search / enrich** (works in **mock** mode without enrichment API keys) → confirm → save.

Full local walkthrough: [`docs/local-dev.md`](./docs/local-dev.md).

## Environment variables

Copy [`.env.example`](./.env.example) → `.env.local` for the SPA.

### Client (required)

| Variable | Local example | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54321` | Hosted: `https://PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | from `supabase status` | Hosted: Project Settings → API |

### Enrichment keys (optional)

Set in the shell for `npm run dev`, or as Netlify function/env vars for deploy. **None required for a local demo** — the function returns labeled mock candidates when keys are missing or sources fail.

| Variable | Purpose |
| --- | --- |
| `OMDB_API_KEY` | IMDb lookup via OMDb (movie / TV / asian drama) |
| `TMDB_API_KEY` | TMDB backup for the same types |
| `OPENAI_API_KEY` | Optional LLM refine of live candidates |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `ANIDB_CLIENT` | Reserved; without it AniDB is search-link only |

Anime live path uses MyAnimeList via the public Jikan API (no key). Details: [`docs/enrichment.md`](./docs/enrichment.md).

### Netlify hosted secrets

Minimum:

1. `VITE_SUPABASE_URL`
2. `VITE_SUPABASE_ANON_KEY`

Optional: enrichment keys above for live lookups in production.

## Netlify deploy notes

Config is in [`netlify.toml`](./netlify.toml):

- Build: `npm run build`
- Publish: `dist`
- Functions: `netlify/functions`
- `/api/*` → `/.netlify/functions/:splat`
- SPA fallback: `/*` → `/index.html`

Suggested steps:

1. Create a hosted Supabase project; apply [`supabase/migrations/`](./supabase/migrations/) (SQL editor or `supabase link` + `supabase db push`).
2. Connect this GitHub repo to Netlify (same build/publish as above).
3. Set the client env vars (and optional enrich keys) in Netlify.
4. Add the Netlify site URL to Supabase Auth redirect allow-list.

Local Netlify functions runner (optional): `npm run dev:netlify` (port **8888**).  
Plain `npm run dev` already serves `/api/enrich` via a Vite middleware.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite SPA + local `/api/enrich` |
| `npm run dev:netlify` | Netlify Dev (functions + SPA) |
| `npm run build` | Typecheck + production build |
| `npm run lint` | Oxlint |
| `npm run supabase:start` / `stop` / `status` / `reset` | Local Supabase lifecycle |
| `npm run supabase:types` | Generate TS types from local DB |

## Docs map

| Doc | Contents |
| --- | --- |
| [`docs/architecture.md`](./docs/architecture.md) | Components and request flow |
| [`docs/local-dev.md`](./docs/local-dev.md) | Docker Supabase, seed, troubleshooting |
| [`docs/enrichment.md`](./docs/enrichment.md) | Sources, keys, mock mode |
| [`docs/schema.md`](./docs/schema.md) | `media_items` + RLS overview |
