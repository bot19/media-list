import { useState, type FormEvent } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

type Props = {
  client: SupabaseClient
  session: Session | null
  onSession: (session: Session | null) => void
}

export function AuthGate({ client, session, onSession }: Props) {
  const [email, setEmail] = useState('demo@media-list.local')
  const [password, setPassword] = useState('password123')
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (session) {
    return (
      <header className="topbar">
        <div>
          <p className="brand">Media List</p>
          <p className="muted">{session.user.email}</p>
        </div>
        <button
          type="button"
          className="ghost"
          onClick={async () => {
            await client.auth.signOut()
            onSession(null)
          }}
        >
          Sign out
        </button>
      </header>
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)

    try {
      if (mode === 'sign-in') {
        const { data, error: signInError } = await client.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        onSession(data.session)
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        if (data.session) {
          onSession(data.session)
        } else {
          setInfo('Check your email to confirm, or sign in if confirmation is disabled locally.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="brand">Media List</p>
        <h1>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</h1>
        <p className="lede">
          Track movies, TV, Asian dramas, and anime. Local seed user:{' '}
          <code>demo@media-list.local</code> / <code>password123</code>
        </p>

        <form className="stack" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          {info ? <p className="info">{info}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          className="linkish"
          onClick={() => {
            setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'))
            setError(null)
            setInfo(null)
          }}
        >
          {mode === 'sign-in'
            ? 'Need an account? Sign up'
            : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}
