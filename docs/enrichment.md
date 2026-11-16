# Enrichment

Endpoint: `POST /api/enrich` → `netlify/functions/enrich.mts`  
(Dev: Vite middleware loads the same module.)

## Request / response

```json
// request
{ "query": "Spirited Away", "mediaType": "movie" }

// response (shape)
{
  "mode": "live" | "mock",
  "query": "...",
  "mediaType": "movie" | "tv" | "asian_drama" | "anime",
  "candidates": [
    {
      "title": "...",
      "year": 2001,
      "genre": "...",
      "posterUrl": "...",
      "sourceRatings": { "imdb": 8.6, "tmdb": 8.5 },
      "sourceUrls": { "imdb": "https://...", "tmdb": "https://..." }
    }
  ],
  "warnings": ["..."],
  "error": "optional"
}
```

UI shows a **mock** vs **live** badge from `mode`.

## Preferred sources

| Media type | Order / sources |
| --- | --- |
| `movie`, `tv`, `asian_drama` | IMDb via OMDb (`OMDB_API_KEY`), then TMDB (`TMDB_API_KEY`) |
| `anime` | MyAnimeList via Jikan (no key); AniDB search links (full AniDB API needs `ANIDB_CLIENT`, not required for scaffold) |

Optional: if `OPENAI_API_KEY` is set and live candidates exist, the function may refine them (`OPENAI_MODEL`, default `gpt-4o-mini`).

## Resilience

- Per-source fetch timeouts (~8s); LLM refine timeout (~12s)
- Failures append to `warnings` and continue to the next source
- If nothing usable is returned → **labeled mock** candidates (`mode: "mock"`) plus an explanatory warning
- Client (`src/lib/enrich.ts`) aborts the HTTP call after ~20s

## Keys

None required for local demo. Documented in `.env.example` and the root README. Never commit real keys.
