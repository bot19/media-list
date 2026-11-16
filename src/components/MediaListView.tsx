import { MEDIA_TYPE_LABELS, type MediaItem } from '../types/media'

type Props = {
  items: MediaItem[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

function formatSources(item: MediaItem): string {
  const bits: string[] = []
  for (const [key, value] of Object.entries(item.source_ratings ?? {})) {
    if (typeof value === 'number') bits.push(`${key.toUpperCase()} ${value}`)
  }
  return bits.join(' · ') || 'No source ratings'
}

export function MediaListView({ items, loading, error, onRefresh }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Your list</h2>
          <p className="muted">Auth-gated rows from Supabase (`media_items`).</p>
        </div>
        <button type="button" className="ghost" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="error" role="alert">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <p className="empty">No items yet. Add one with the enrich form.</p>
      ) : null}

      <ul className="media-grid">
        {items.map((item) => (
          <li key={item.id} className="media-row">
            {item.poster_url ? (
              <img src={item.poster_url} alt="" className="poster" loading="lazy" />
            ) : (
              <div className="poster poster-fallback" aria-hidden="true" />
            )}
            <div className="media-body">
              <div className="media-title-row">
                <h3>{item.canonical_title}</h3>
                <span className="tag">{MEDIA_TYPE_LABELS[item.media_type]}</span>
              </div>
              <p className="meta">
                {[item.year, item.genre].filter(Boolean).join(' · ') || 'Details pending'}
              </p>
              <p className="meta">{formatSources(item)}</p>
              <p className="rating">
                Yours:{' '}
                {item.user_rating != null ? `${item.user_rating}/10` : 'unrated'}
              </p>
              {item.comments ? <p className="comments">{item.comments}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
