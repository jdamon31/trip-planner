'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMemberFromStorage, saveMemberToStorage } from '@/hooks/useMember'
import { useAuth } from '@/contexts/AuthContext'
import { SignInButtons } from '@/components/auth/SignInButtons'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function JoinPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const tripId = params.id
  const { user, loading: authLoading } = useAuth()
  const [screen, setScreen] = useState<'signin' | 'name'>('signin')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tripName, setTripName] = useState<string | null>(null)

  useEffect(() => {
    getSupabaseClient().from('trips').select('name').eq('id', tripId).single()
      .then(({ data }) => { if (data) setTripName(data.name) })
  }, [tripId])

  useEffect(() => {
    if (authLoading) return
    const existing = getMemberFromStorage(tripId)
    if (existing) { router.replace(`/trips/${tripId}`); return }
    if (user) setScreen('name')
  }, [tripId, router, user, authLoading])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, userId: user?.id ?? null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to join trip'); setLoading(false); return }
    saveMemberToStorage(tripId, { memberId: data.id, displayName: data.displayName })
    router.replace(`/trips/${tripId}`)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF8EF' }}>
        <p style={{ color: 'rgba(62,44,35,0.4)' }}>Loading…</p>
      </div>
    )
  }

  const display: React.CSSProperties = { fontFamily: 'var(--font-playfair)' }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#FAF8EF' }}>
      {/* Header bar */}
      <div className="px-6 py-4 border-b" style={{ background: '#3E2C23', borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="text-lg" style={{ ...display, color: '#FAF8EF' }}>Tripkit</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Eyebrow */}
          <p className="text-xs font-semibold tracking-widest uppercase text-center mb-3" style={{ color: '#D2691E' }}>
            You're invited
          </p>

          {/* Headline */}
          <h1 className="text-3xl text-center mb-2 leading-tight" style={{ ...display, color: '#3E2C23' }}>
            {tripName ? (
              <>{tripName}</>
            ) : (
              'Join the trip'
            )}
          </h1>
          <p className="text-center mb-10 text-sm" style={{ color: 'rgba(62,44,35,0.5)' }}>
            {screen === 'signin'
              ? 'Sign in to keep your trips synced, or continue anonymously.'
              : 'What should we call you in the group?'}
          </p>

          {/* Card */}
          <div className="bg-white rounded-2xl p-6 space-y-3" style={{ border: '1px solid rgba(62,44,35,0.08)', boxShadow: '0 4px 24px rgba(62,44,35,0.06)' }}>
            {screen === 'signin' ? (
              <>
                <SignInButtons redirectTo={`/trips/${tripId}/join`} />
                <div className="relative flex items-center gap-3 my-1">
                  <div className="flex-1 h-px" style={{ background: 'rgba(62,44,35,0.08)' }} />
                  <span className="text-xs" style={{ color: 'rgba(62,44,35,0.3)' }}>or</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(62,44,35,0.08)' }} />
                </div>
                <button
                  onClick={() => setScreen('name')}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'rgba(62,44,35,0.05)', color: 'rgba(62,44,35,0.7)' }}
                >
                  Continue without signing in
                </button>
              </>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(62,44,35,0.45)' }}>
                    Your name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Alex"
                    autoFocus
                    required
                    className="w-full rounded-xl px-4 py-3 text-base focus:outline-none transition-colors"
                    style={{
                      border: '2px solid rgba(62,44,35,0.1)',
                      background: '#FAF8F5',
                      color: '#3E2C23',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#6B8E23')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(62,44,35,0.1)')}
                  />
                </div>
                {error && <p className="text-sm" style={{ color: '#D2691E' }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !displayName.trim()}
                  className="w-full py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: '#3E2C23', color: '#FAF8EF' }}
                >
                  {loading ? 'Joining…' : "Let's go →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
