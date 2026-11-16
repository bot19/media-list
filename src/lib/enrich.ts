import type { EnrichResponse, MediaType } from '../types/media'

export async function enrichMedia(
  query: string,
  mediaType: MediaType,
): Promise<EnrichResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mediaType }),
      signal: controller.signal,
    })

    const payload = (await response.json()) as EnrichResponse

    if (!response.ok) {
      return {
        mode: payload.mode ?? 'mock',
        query,
        mediaType,
        candidates: payload.candidates ?? [],
        warnings: payload.warnings ?? [],
        error:
          payload.error ??
          `Enrichment failed with status ${response.status}.`,
      }
    }

    return payload
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Enrichment timed out. Try again or use a more specific title.'
        : error instanceof Error
          ? error.message
          : 'Enrichment request failed.'

    return {
      mode: 'mock',
      query,
      mediaType,
      candidates: [],
      warnings: [],
      error: message,
    }
  } finally {
    window.clearTimeout(timeout)
  }
}
