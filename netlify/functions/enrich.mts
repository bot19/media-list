import type { Context } from '@netlify/functions'
import type { MediaType, EnrichCandidate, SourceRatings, SourceUrls } from '../../src/types/media'

const FETCH_TIMEOUT_MS = 8_000
const LLM_TIMEOUT_MS = 12_000

type EnrichBody = {
  query?: string
  mediaType?: MediaType
}

type EnrichResult = {
  mode: 'live' | 'mock'
  query: string
  mediaType: MediaType
  candidates: EnrichCandidate[]
  warnings: string[]
  error?: string
}

const MEDIA_TYPES: MediaType[] = ['movie', 'tv', 'asian_drama', 'anime']

function json(status: number, body: EnrichResult): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

function mockCandidates(query: string, mediaType: MediaType): EnrichCandidate[] {
  const year = new Date().getFullYear() - 1
  const baseTitle = query.trim() || 'Untitled'

  if (mediaType === 'anime') {
    return [
      {
        title: `${baseTitle}`,
        year,
        genre: 'Adventure, Fantasy',
        posterUrl: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
        sourceRatings: { mal: 7.8, anidb: 7.5 },
        sourceUrls: {
          mal: `https://myanimelist.net/anime.php?q=${encodeURIComponent(baseTitle)}`,
          anidb: `https://anidb.net/perl-bin/animedb.pl?show=animelist&adb.search=${encodeURIComponent(baseTitle)}`,
        },
      },
      {
        title: `${baseTitle} (alt spelling)`,
        year: year - 2,
        genre: 'Drama',
        posterUrl: null,
        sourceRatings: { mal: 7.1 },
        sourceUrls: {
          mal: `https://myanimelist.net/anime.php?q=${encodeURIComponent(baseTitle)}`,
        },
      },
    ]
  }

  const kind = mediaType === 'movie' ? 'movie' : 'tv'
  return [
    {
      title: baseTitle,
      year,
      genre: mediaType === 'asian_drama' ? 'Romance, Drama' : 'Drama',
      posterUrl: 'https://image.tmdb.org/t/p/w500/placeholder-missing.jpg',
      sourceRatings: { imdb: 7.4, tmdb: 7.1 },
      sourceUrls: {
        imdb: `https://www.imdb.com/find/?q=${encodeURIComponent(baseTitle)}`,
        tmdb: `https://www.themoviedb.org/search?query=${encodeURIComponent(baseTitle)}`,
      },
    },
    {
      title: `${baseTitle}: Remastered`,
      year: year - 5,
      genre: 'Action',
      posterUrl: null,
      sourceRatings: { imdb: 6.9 },
      sourceUrls: {
        imdb: `https://www.imdb.com/find/?q=${encodeURIComponent(baseTitle)}`,
        tmdb: `https://www.themoviedb.org/search/${kind}?query=${encodeURIComponent(baseTitle)}`,
      },
    },
  ]
}

type OmdbSearch = {
  Search?: Array<{
    Title: string
    Year: string
    imdbID: string
    Type: string
    Poster: string
  }>
  Error?: string
}

type OmdbDetail = {
  Title?: string
  Year?: string
  Genre?: string
  Poster?: string
  imdbRating?: string
  imdbID?: string
  Response?: string
  Error?: string
}

async function searchImdbViaOmdb(
  query: string,
  mediaType: MediaType,
  apiKey: string,
  warnings: string[],
): Promise<EnrichCandidate[]> {
  const typeParam =
    mediaType === 'movie' ? 'movie' : mediaType === 'tv' || mediaType === 'asian_drama' ? 'series' : undefined

  try {
    const searchUrl = new URL('https://www.omdbapi.com/')
    searchUrl.searchParams.set('apikey', apiKey)
    searchUrl.searchParams.set('s', query)
    if (typeParam) searchUrl.searchParams.set('type', typeParam)

    const search = await fetchJson<OmdbSearch>(searchUrl.toString())
    if (search.Error || !search.Search?.length) {
      warnings.push(`IMDb/OMDb: ${search.Error ?? 'no results'}`)
      return []
    }

    const top = search.Search.slice(0, 3)
    const details = await Promise.all(
      top.map(async (item) => {
        try {
          const detailUrl = new URL('https://www.omdbapi.com/')
          detailUrl.searchParams.set('apikey', apiKey)
          detailUrl.searchParams.set('i', item.imdbID)
          detailUrl.searchParams.set('plot', 'short')
          return await fetchJson<OmdbDetail>(detailUrl.toString())
        } catch (error) {
          warnings.push(
            `IMDb/OMDb detail failed for ${item.imdbID}: ${error instanceof Error ? error.message : 'unknown'}`,
          )
          return null
        }
      }),
    )

    return details
      .filter((d): d is OmdbDetail => Boolean(d && d.Response !== 'False'))
      .map((detail) => {
        const yearNum = detail.Year ? Number.parseInt(detail.Year.slice(0, 4), 10) : null
        const rating = detail.imdbRating && detail.imdbRating !== 'N/A'
          ? Number.parseFloat(detail.imdbRating)
          : undefined
        const poster =
          detail.Poster && detail.Poster !== 'N/A' ? detail.Poster : null

        const sourceRatings: SourceRatings = {}
        const sourceUrls: SourceUrls = {}
        if (typeof rating === 'number' && !Number.isNaN(rating)) {
          sourceRatings.imdb = rating
        }
        if (detail.imdbID) {
          sourceUrls.imdb = `https://www.imdb.com/title/${detail.imdbID}/`
        }

        return {
          title: detail.Title ?? query,
          year: Number.isFinite(yearNum) ? yearNum : null,
          genre: detail.Genre && detail.Genre !== 'N/A' ? detail.Genre : null,
          posterUrl: poster,
          sourceRatings,
          sourceUrls,
        } satisfies EnrichCandidate
      })
  } catch (error) {
    warnings.push(
      `IMDb/OMDb failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
    return []
  }
}

type TmdbSearch = {
  results?: Array<{
    id: number
    title?: string
    name?: string
    release_date?: string
    first_air_date?: string
    poster_path?: string | null
    genre_ids?: number[]
    vote_average?: number
    media_type?: string
  }>
}

async function searchTmdb(
  query: string,
  mediaType: MediaType,
  apiKey: string,
  warnings: string[],
): Promise<EnrichCandidate[]> {
  const endpoint =
    mediaType === 'movie'
      ? 'movie'
      : mediaType === 'tv' || mediaType === 'asian_drama'
        ? 'tv'
        : 'multi'

  try {
    const url = new URL(`https://api.themoviedb.org/3/search/${endpoint}`)
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('query', query)
    url.searchParams.set('include_adult', 'false')

    const data = await fetchJson<TmdbSearch>(url.toString())
    const results = (data.results ?? []).slice(0, 5)

    if (!results.length) {
      warnings.push('TMDB: no results')
      return []
    }

    return results.map((item) => {
      const title = item.title ?? item.name ?? query
      const date = item.release_date ?? item.first_air_date
      const year = date ? Number.parseInt(date.slice(0, 4), 10) : null
      const pathKind =
        mediaType === 'movie' || item.media_type === 'movie' ? 'movie' : 'tv'
      const sourceRatings: SourceRatings = {}
      const sourceUrls: SourceUrls = {
        tmdb: `https://www.themoviedb.org/${pathKind}/${item.id}`,
      }
      if (typeof item.vote_average === 'number') {
        sourceRatings.tmdb = Math.round(item.vote_average * 10) / 10
      }

      return {
        title,
        year: Number.isFinite(year) ? year : null,
        genre: null,
        posterUrl: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : null,
        sourceRatings,
        sourceUrls,
      } satisfies EnrichCandidate
    })
  } catch (error) {
    warnings.push(
      `TMDB failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
    return []
  }
}

type JikanSearch = {
  data?: Array<{
    mal_id: number
    title: string
    title_english?: string | null
    year?: number | null
    aired?: { from?: string | null }
    genres?: Array<{ name: string }>
    images?: { jpg?: { image_url?: string; large_image_url?: string } }
    score?: number | null
    url?: string
  }>
}

async function searchMalViaJikan(
  query: string,
  warnings: string[],
): Promise<EnrichCandidate[]> {
  try {
    const url = new URL('https://api.jikan.moe/v4/anime')
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '5')

    const data = await fetchJson<JikanSearch>(url.toString())
    const results = data.data ?? []
    if (!results.length) {
      warnings.push('MyAnimeList (Jikan): no results')
      return []
    }

    return results.map((item) => {
      const yearFromAired = item.aired?.from
        ? Number.parseInt(item.aired.from.slice(0, 4), 10)
        : null
      const sourceRatings: SourceRatings = {}
      if (typeof item.score === 'number') sourceRatings.mal = item.score

      return {
        title: item.title_english || item.title,
        year: item.year ?? (Number.isFinite(yearFromAired) ? yearFromAired : null),
        genre: item.genres?.map((g) => g.name).join(', ') || null,
        posterUrl:
          item.images?.jpg?.large_image_url ??
          item.images?.jpg?.image_url ??
          null,
        sourceRatings,
        sourceUrls: {
          mal: item.url ?? `https://myanimelist.net/anime/${item.mal_id}`,
          anidb: `https://anidb.net/perl-bin/animedb.pl?show=animelist&adb.search=${encodeURIComponent(item.title)}`,
        },
      } satisfies EnrichCandidate
    })
  } catch (error) {
    warnings.push(
      `MyAnimeList (Jikan) failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
    return []
  }
}

async function refineWithLlm(
  query: string,
  mediaType: MediaType,
  candidates: EnrichCandidate[],
  apiKey: string,
  warnings: string[],
): Promise<EnrichCandidate[]> {
  if (!candidates.length) return candidates

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You refine media search candidates. Return JSON: {"candidates":[{"title":string,"year":number|null,"genre":string|null,"posterUrl":string|null,"sourceRatings":object,"sourceUrls":object}]}. Prefer preferred sources: IMDb then TMDB for movie/tv/asian_drama; AniDB+MAL for anime. Keep at most 5. Do not invent source URLs you were not given.',
          },
          {
            role: 'user',
            content: JSON.stringify({ query, mediaType, candidates }),
          },
        ],
      }),
    })
    clearTimeout(timer)

    if (!response.ok) {
      warnings.push(`LLM refine failed: HTTP ${response.status}`)
      return candidates
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      warnings.push('LLM refine returned empty content')
      return candidates
    }

    const parsed = JSON.parse(content) as { candidates?: EnrichCandidate[] }
    if (!parsed.candidates?.length) {
      warnings.push('LLM refine returned no candidates; keeping source results')
      return candidates
    }
    return parsed.candidates
  } catch (error) {
    warnings.push(
      `LLM refine skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
    return candidates
  }
}

function mergeByTitle(candidates: EnrichCandidate[]): EnrichCandidate[] {
  const map = new Map<string, EnrichCandidate>()
  for (const candidate of candidates) {
    const key = `${candidate.title.toLowerCase()}::${candidate.year ?? ''}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, candidate)
      continue
    }
    map.set(key, {
      ...existing,
      genre: existing.genre || candidate.genre,
      posterUrl: existing.posterUrl || candidate.posterUrl,
      sourceRatings: { ...candidate.sourceRatings, ...existing.sourceRatings },
      sourceUrls: { ...candidate.sourceUrls, ...existing.sourceUrls },
    })
  }
  return [...map.values()].slice(0, 5)
}

async function liveEnrich(
  query: string,
  mediaType: MediaType,
): Promise<{ candidates: EnrichCandidate[]; warnings: string[]; usedLive: boolean }> {
  const warnings: string[] = []
  let candidates: EnrichCandidate[] = []

  const omdbKey = process.env.OMDB_API_KEY
  const tmdbKey = process.env.TMDB_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (mediaType === 'anime') {
    candidates = await searchMalViaJikan(query, warnings)
    if (!process.env.ANIDB_CLIENT) {
      warnings.push(
        'AniDB client not configured (ANIDB_CLIENT); using MAL/Jikan + AniDB search links only.',
      )
    }
  } else {
    if (omdbKey) {
      candidates = await searchImdbViaOmdb(query, mediaType, omdbKey, warnings)
    } else {
      warnings.push('OMDB_API_KEY missing — skipped IMDb/OMDb lookup.')
    }

    if (tmdbKey) {
      const tmdb = await searchTmdb(query, mediaType, tmdbKey, warnings)
      candidates = mergeByTitle([...candidates, ...tmdb])
    } else {
      warnings.push('TMDB_API_KEY missing — skipped TMDB lookup.')
    }
  }

  if (openaiKey && candidates.length) {
    candidates = await refineWithLlm(query, mediaType, candidates, openaiKey, warnings)
  } else if (!openaiKey) {
    warnings.push('OPENAI_API_KEY missing — skipped LLM refine step.')
  }

  const usedLive = candidates.length > 0
  return { candidates, warnings, usedLive }
}

export default async function handler(request: Request, _context: Context) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'POST') {
    return json(405, {
      mode: 'mock',
      query: '',
      mediaType: 'movie',
      candidates: [],
      warnings: [],
      error: 'Method not allowed. Use POST.',
    })
  }

  let body: EnrichBody
  try {
    body = (await request.json()) as EnrichBody
  } catch {
    return json(400, {
      mode: 'mock',
      query: '',
      mediaType: 'movie',
      candidates: [],
      warnings: [],
      error: 'Invalid JSON body.',
    })
  }

  const query = (body.query ?? '').trim()
  const mediaType = body.mediaType

  if (!query) {
    return json(400, {
      mode: 'mock',
      query: '',
      mediaType: mediaType ?? 'movie',
      candidates: [],
      warnings: [],
      error: 'query is required.',
    })
  }

  if (!mediaType || !MEDIA_TYPES.includes(mediaType)) {
    return json(400, {
      mode: 'mock',
      query,
      mediaType: 'movie',
      candidates: [],
      warnings: [],
      error: `mediaType must be one of: ${MEDIA_TYPES.join(', ')}`,
    })
  }

  try {
    const { candidates, warnings, usedLive } = await liveEnrich(query, mediaType)

    if (!usedLive) {
      return json(200, {
        mode: 'mock',
        query,
        mediaType,
        candidates: mockCandidates(query, mediaType),
        warnings: [
          ...warnings,
          'Using labeled mock enrichment candidates because live sources returned no results or keys are missing.',
        ],
      })
    }

    return json(200, {
      mode: 'live',
      query,
      mediaType,
      candidates,
      warnings,
    })
  } catch (error) {
    return json(200, {
      mode: 'mock',
      query,
      mediaType,
      candidates: mockCandidates(query, mediaType),
      warnings: [
        `Live enrichment error: ${error instanceof Error ? error.message : 'unknown'}`,
        'Fell back to labeled mock candidates.',
      ],
    })
  }
}
