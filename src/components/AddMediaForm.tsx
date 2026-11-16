import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enrichMedia } from '../lib/enrich'
import {
  MEDIA_TYPE_LABELS,
  type EnrichCandidate,
  type MediaType,
} from '../types/media'

type Props = {
  client: SupabaseClient
  userId: string
  onCreated: () => void
}

const TYPES: MediaType[] = ['movie', 'tv', 'asian_drama', 'anime']

export function AddMediaForm({ client, userId, onCreated }: Props) {
  const [name, setName] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('movie')
  const [enriching, setEnriching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'live' | 'mock' | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<EnrichCandidate[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [userRating, setUserRating] = useState('8')
  const [comments, setComments] = useState('')

  const selected = candidates[selectedIndex] ?? null

  async function onSearch(event: FormEvent) {
    event.preventDefault()
    setEnriching(true)
    setError(null)
    setWarnings([])
    setCandidates([])
    setMode(null)

    const result = await enrichMedia(name, mediaType)
    setMode(result.mode)
    setWarnings(result.warnings)
    setCandidates(result.candidates)
    setSelectedIndex(0)

    if (result.error && !result.candidates.length) {
      setError(result.error)
    } else if (result.error) {
      setWarnings((w) => [...w, result.error!])
    }

    setEnriching(false)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!selected) {
      setError('Search and pick a candidate before saving.')
      return
    }

    setSaving(true)
    setError(null)

    const ratingValue = userRating.trim() === '' ? null : Number.parseFloat(userRating)
    if (ratingValue != null && (Number.isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10)) {
      setError('User rating must be between 0 and 10.')
      setSaving(false)
      return
    }

    const { error: insertError } = await client.from('media_items').insert({
      user_id: userId,
      media_type: mediaType,
      canonical_title: selected.title,
      year: selected.year,
      genre: selected.genre,
      poster_url: selected.posterUrl,
      source_ratings: selected.sourceRatings,
      source_urls: selected.sourceUrls,
      user_rating: ratingValue,
      comments: comments.trim() || null,
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setName('')
    setComments('')
    setCandidates([])
    setMode(null)
    setWarnings([])
    onCreated()
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Add media</h2>
          <p className="muted">
            Search/enrich via Netlify function, confirm a candidate, then save to
            Supabase.
          </p>
        </div>
      </div>

      <form className="stack" onSubmit={onSearch}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spirited Away"
            required
          />
        </label>
        <label>
          Media type
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as MediaType)}
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {MEDIA_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={enriching || !name.trim()}>
          {enriching ? 'Searching…' : 'Search / enrich'}
        </button>
      </form>

      {mode ? (
        <p className={mode === 'mock' ? 'badge mock' : 'badge live'}>
          Enrichment mode: {mode === 'mock' ? 'mock (labeled)' : 'live'}
        </p>
      ) : null}

      {warnings.length ? (
        <ul className="warnings">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="error" role="alert">{error}</p> : null}

      {candidates.length ? (
        <form className="stack confirm" onSubmit={onSubmit}>
          <fieldset>
            <legend>Candidates</legend>
            <div className="candidate-list">
              {candidates.map((candidate, index) => (
                <label key={`${candidate.title}-${index}`} className="candidate">
                  <input
                    type="radio"
                    name="candidate"
                    checked={selectedIndex === index}
                    onChange={() => setSelectedIndex(index)}
                  />
                  <div>
                    <strong>{candidate.title}</strong>
                    <p className="meta">
                      {[candidate.year, candidate.genre].filter(Boolean).join(' · ') ||
                        'No year/genre'}
                    </p>
                    <p className="meta">
                      {Object.entries(candidate.sourceRatings)
                        .filter(([, v]) => typeof v === 'number')
                        .map(([k, v]) => `${k.toUpperCase()} ${v}`)
                        .join(' · ') || 'No source ratings'}
                    </p>
                  </div>
                  {candidate.posterUrl ? (
                    <img src={candidate.posterUrl} alt="" className="poster sm" />
                  ) : null}
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            Your rating (0–10)
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={userRating}
              onChange={(e) => setUserRating(e.target.value)}
            />
          </label>
          <label>
            Comments
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Optional notes"
            />
          </label>
          <button type="submit" disabled={saving || !selected}>
            {saving ? 'Saving…' : 'Add to list'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
