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

    // If already in localStorage, skip join entirely
    const existing = getMemberFromStorage(tripId)
    if (existing) {
      router.replace(`/trips/${tripId}`)
      return
    }

    // If signed in, skip to name screen
    if (user) {
      setScreen('name')
    }
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
    if (!res.ok) {
      setError(data.error || 'Failed to join trip')
      setLoading(false)
      return
    }

    saveMemberToStorage(tripId, { memberId: data.id, displayName: data.displayName })
    router.replace(`/trips/${tripId}`)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {screen === 'signin' ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">
              {tripName ? `You're invited to ${tripName}` : 'Join the trip'}
            </h1>
            <p className="text-gray-500 text-center mb-8">Sign in to keep your trips synced across devices</p>

            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
              <SignInButtons redirectTo={`/trips/${tripId}/join`} />
              <button
                onClick={() => setScreen('name')}
                className="w-full text-sm text-gray-500 py-2 active:text-gray-700"
              >
                Continue without signing in
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">
              {tripName ? `You're invited to ${tripName}` : 'Join the trip'}
            </h1>
            <p className="text-gray-500 text-center mb-8">What should we call you?</p>

            <form onSubmit={handleJoin} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Alex"
                  autoFocus
                  className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading || !displayName.trim()}
                className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50 active:bg-blue-700"
              >
                {loading ? 'Joining…' : "Let's go"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
