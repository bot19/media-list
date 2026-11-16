# Architecture

## Pieces

| Piece | Location | Role |
| --- | --- | --- |
| SPA | `src/` | Auth UI, media list, add/enrich/confirm form |
| Supabase | `supabase/` | Auth users, Postgres `media_items`, RLS, seed |
| Enrich API | `netlify/functions/enrich.mts` | Search preferred web sources (+ optional LLM); mock fallback |
| Hosting | `netlify.toml` | Static `dist` + functions; `/api/*` rewrite |

## Runtime flow

1. User signs in with Supabase Auth (email/password).
2. SPA loads `media_items` for `auth.uid()` (RLS).
3. On add: user enters name + `media_type` → `POST /api/enrich`.
4. Function returns candidates (`title`, ratings, year, genre, poster, source URLs) with `mode: "live" | "mock"`.
5. User picks a candidate, adds `user_rating` / `comments`, inserts into Supabase.

## Local vs deploy

| Concern | Local | Deploy |
| --- | --- | --- |
| DB / Auth | Docker Desktop + `supabase start` | Hosted Supabase project |
| SPA | `npm run dev` (port 5173) | Netlify `dist` |
| Enrich | Vite middleware → same `enrich.mts`, or `npm run dev:netlify` | Netlify Functions |

## Client modules

- `src/lib/supabase.ts` — creates client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `src/lib/enrich.ts` — `fetch('/api/enrich')` with client-side abort timeout
- `src/components/AuthGate.tsx` — sign-in / sign-up / sign-out
- `src/components/MediaListView.tsx` — list
- `src/components/AddMediaForm.tsx` — search → pick → save
