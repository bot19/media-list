export type MediaType = 'movie' | 'tv' | 'asian_drama' | 'anime'

export type SourceRatings = {
  imdb?: number
  tmdb?: number
  mal?: number
  anidb?: number
  [key: string]: number | undefined
}

export type SourceUrls = {
  imdb?: string
  tmdb?: string
  mal?: string
  anidb?: string
  [key: string]: string | undefined
}

export type MediaItem = {
  id: string
  user_id: string
  media_type: MediaType
  canonical_title: string
  year: number | null
  genre: string | null
  poster_url: string | null
  source_ratings: SourceRatings
  source_urls: SourceUrls
  user_rating: number | null
  comments: string | null
  created_at: string
  updated_at: string
}

export type EnrichCandidate = {
  title: string
  year: number | null
  genre: string | null
  posterUrl: string | null
  sourceRatings: SourceRatings
  sourceUrls: SourceUrls
}

export type EnrichResponse = {
  mode: 'live' | 'mock'
  query: string
  mediaType: MediaType
  candidates: EnrichCandidate[]
  warnings: string[]
  error?: string
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Movie',
  tv: 'TV',
  asian_drama: 'Asian drama',
  anime: 'Anime',
}
