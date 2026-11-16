import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AddMediaForm } from './components/AddMediaForm'
import { AuthGate } from './components/AuthGate'
import { MediaListView } from './components/MediaListView'
import { requireSupabase, supabase, supabaseConfigured } from './lib/supabase'
import type { MediaItem } from './types/media'

function ConfigMissing() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="brand">Media List</p>
        <h1>Configure Supabase</h1>
        <p className="lede">
          Copy <code>.env.example</code> to <code>.env.local</code> and set{' '}
          <code>VITE_SUPABASE_URL</code> + <code>VITE_SUPABASE_ANON_KEY</code>.
          For local backend, run Docker Desktop then{' '}
          <code>npm run supabase:start</code> and paste the printed keys.
        </p>
      </section>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [items, setItems] = useState<MediaItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setBootstrapping(false)
      return
    }

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setBootstrapping(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const loadItems = useCallback(async () => {
    if (!session) {
      setItems([])
      return
    }

    const client = requireSupabase()
    setListLoading(true)
    setListError(null)

    const { data, error } = await client
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setListError(error.message)
      setItems([])
    } else {
      setItems((data ?? []) as MediaItem[])
    }
    setListLoading(false)
  }, [session])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  if (!supabaseConfigured) return <ConfigMissing />
  if (bootstrapping) {
    return (
      <main className="auth-shell">
        <p className="muted">Loading…</p>
      </main>
    )
  }

  const client = requireSupabase()

  if (!session) {
    return (
      <AuthGate
        client={client}
        session={session}
        onSession={setSession}
      />
    )
  }

  return (
    <div className="app-shell">
      <AuthGate client={client} session={session} onSession={setSession} />
      <main className="layout">
        <AddMediaForm
          client={client}
          userId={session.user.id}
          onCreated={() => void loadItems()}
        />
        <MediaListView
          items={items}
          loading={listLoading}
          error={listError}
          onRefresh={() => void loadItems()}
        />
      </main>
    </div>
  )
}
