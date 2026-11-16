# Local development

Preferred backend for development and testing: **Supabase CLI + Docker Desktop**. Hosted Supabase is for deploy only.

## Prerequisites

- Node.js 22+ (repo developed on Node 22)
- npm
- **Docker Desktop** (or compatible Docker engine on `PATH`)

Without Docker, `npm run supabase:start` will fail. The SPA and enrich middleware can still build; auth/list/add need a reachable Supabase.

## First-time setup

```bash
npm install
npm run supabase:start
npx supabase status -o env
```

From status output, set in `.env.local` (from `.env.example`):

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from status>
```

Apply schema + seed:

```bash
npm run supabase:reset
npm run dev
```

Open http://127.0.0.1:5173.

## Demo login

| User | Email | Password | Notes |
| --- | --- | --- | --- |
| Demo | `demo@media-list.local` | `password123` | Four seeded media rows |
| Alt | `alt@media-list.local` | `password123` | One row; used to verify RLS isolation |

Seed file: `supabase/seed.sql`.

## Exercise list / add

1. Sign in as the demo user → confirm seeded list.
2. **Add media** → enter a title + type → **Search / enrich**.
3. Without enrich API keys you should see `Enrichment mode: mock (labeled)` and still be able to confirm + save.
4. Refresh list → new row appears (demo user only).

## Optional: Netlify Dev

```bash
npm run dev:netlify
```

Serves on port **8888** with real Netlify function bundling. Plain `npm run dev` already mounts `/api/enrich` in Vite (`vite.config.ts`).

## Useful commands

| Command | Effect |
| --- | --- |
| `npm run supabase:status` | URLs and keys |
| `npm run supabase:reset` | Re-run migrations + `seed.sql` |
| `npm run supabase:stop` | Stop local stack |
| `npm run build` | Production build check |

## Auth redirect URLs

`supabase/config.toml` allows:

- `http://127.0.0.1:5173`, `http://localhost:5173`
- `http://127.0.0.1:8888`, `http://localhost:8888`

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `docker: command not found` | Start/install Docker Desktop |
| SPA says configure Supabase | `.env.local` missing or wrong keys; restart Vite after edits |
| Empty list after login | Wrong user, or reset seed (`supabase:reset`) |
| Enrich 404 | Use `npm run dev` or `dev:netlify`, not a static file server alone |
