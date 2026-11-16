# AGENTS.md

Guidance for coding agents working in this repository.

## What this repo is

Thin **Media List** client: Vite/React SPA on Netlify, Supabase for auth + Postgres, one Netlify function for title enrichment. Prefer **local Supabase (Docker Desktop)** for backend work; treat hosted Supabase + Netlify as the deploy target.

## Architecture (short)

```
Browser SPA (src/)
  ├─ Supabase JS → Auth + media_items (RLS)
  └─ POST /api/enrich → netlify/functions/enrich.mts
       ├─ live: OMDb/IMDb, TMDB, Jikan/MAL (+ optional OpenAI refine)
       └─ mock: labeled candidates when keys missing / timeouts / empty results
```

Details: [`docs/architecture.md`](./docs/architecture.md).

## Commands agents should use

| Task | Command |
| --- | --- |
| Install | `npm install` |
| App + enrich middleware | `npm run dev` |
| Typecheck / build | `npm run build` |
| Lint | `npm run lint` |
| Start local Supabase | `npm run supabase:start` (needs Docker) |
| Apply migrations + seed | `npm run supabase:reset` |
| Print local keys | `npx supabase status -o env` |

Do **not** invent alternate package managers or Bun runtimes for this app.

## Enrichment sources (do not swap casually)

| `media_type` | Preferred sources |
| --- | --- |
| `movie`, `tv`, `asian_drama` | IMDb first (via OMDb), then TMDB |
| `anime` | AniDB + MyAnimeList (live MAL via Jikan; AniDB link-only unless `ANIDB_CLIENT` is wired) |

Keep timeouts, clear warnings, and the **labeled** `mode: "mock"` fallback. See [`docs/enrichment.md`](./docs/enrichment.md).

## Do

- Keep the SPA thin: UI + Supabase client + call to `/api/enrich`.
- Put schema changes in new files under `supabase/migrations/`; update seed if list/add demos break.
- Document new env vars in `.env.example` and README.
- Preserve RLS: users only touch their own `media_items` rows.
- After meaningful changes, run `npm run build`.

## Don’t

- Don’t require real enrichment API keys for a basic local demo (mock path must remain).
- Don’t commit `.env.local`, service-role keys, or secrets.
- Don’t bypass RLS with the service role from the browser.
- Don’t replace Supabase or Netlify without an explicit product decision.
- Don’t wait on the user’s Netlify/Supabase cloud credentials to finish scaffold or docs work.
- Don’t expand into unrelated product features while fixing docs or small scaffold gaps.

## Key paths

| Path | Role |
| --- | --- |
| `src/App.tsx` | Auth session, list load, layout |
| `src/components/` | Auth, list, add/enrich form |
| `src/lib/supabase.ts` | Client from `VITE_SUPABASE_*` |
| `netlify/functions/enrich.mts` | Enrichment + mock fallback |
| `vite.config.ts` | Dev `/api/enrich` middleware |
| `supabase/migrations/` | Schema |
| `supabase/seed.sql` | Demo users + fixtures |
| `docs/` | Human/agent reference docs |

## Demo credentials (local seed only)

- `demo@media-list.local` / `password123`
- Alt user (should not appear for demo login): `alt@media-list.local` / `password123`
