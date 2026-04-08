'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { SignInButtons } from '@/components/auth/SignInButtons'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Trip } from '@/lib/supabase/types'

type MyTrip = Trip & { memberCount: number }

function tripInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export default function HomePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [myTrips, setMyTrips] = useState<MyTrip[]>([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    if (!user) {
      setMyTrips([])
      return
    }
    setTripsLoading(true)
    const supabase = getSupabaseClient()
    supabase
      .from('members')
      .select('trip_id, trips(*)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) { setTripsLoading(false); return }
        const trips = data.map((row: any) => row.trips as Trip).filter(Boolean)
        // Fetch member counts
        Promise.all(
          trips.map(trip =>
            supabase.from('members').select('id', { count: 'exact', head: true }).eq('trip_id', trip.id)
              .then(({ count }) => ({ ...trip, memberCount: count ?? 0 }))
          )
        ).then(results => {
          setMyTrips(results)
          setTripsLoading(false)
        })
      })
  }, [user])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setCreateError('')

    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, destination, createdByUserId: user?.id ?? null }),
    })

    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error || 'Failed to create trip')
      setCreating(false)
      return
    }

    router.push(`/trips/${data.id}/join`)
  }

  return (
    <main className="min-h-screen p-6">
      {/* Header */}
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Trip Planner</h1>
          {!authLoading && (
            user ? (
              <button
                onClick={signOut}
                className="text-sm text-gray-500 border rounded-full px-3 py-1.5 active:bg-gray-50"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => setShowSignIn(s => !s)}
                className="text-sm text-blue-600 font-medium border border-blue-200 rounded-full px-3 py-1.5 active:bg-blue-50"
              >
                Sign in
              </button>
            )
          )}
        </div>

        {/* Sign-in panel */}
        {showSignIn && !user && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <p className="text-sm text-gray-500 mb-4 text-center">Sign in to see your trips across devices</p>
            <SignInButtons redirectTo="/" />
          </div>
        )}

        {/* My Trips */}
        {user && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Trips</h2>
            {tripsLoading ? (
              <p className="text-sm text-gray-400 py-4">Loading your trips…</p>
            ) : myTrips.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No trips yet — create one below.</p>
            ) : (
              <div className="space-y-2">
                {myTrips.map(trip => (
                  <button
                    key={trip.id}
                    onClick={() => router.push(`/trips/${trip.id}`)}
                    className="w-full bg-white rounded-xl border text-left active:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0">
                        {trip.photo_url
                          ? <img src={trip.photo_url} alt={trip.name} className="w-full h-full object-cover" />
                          : <span className="text-blue-600 font-bold text-sm">{tripInitials(trip.name)}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{trip.name}</div>
                        {trip.destination && (
                          <div className="text-sm text-gray-500 mt-0.5">📍 {trip.destination}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {trip.memberCount} member{trip.memberCount !== 1 ? 's' : ''}
                          {trip.confirmed_date ? ` · ${trip.confirmed_date}` : ''}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Create Trip */}
        <p className="text-gray-500 text-sm text-center mb-6">
          {user ? 'Start a new trip' : 'Plan trips with your group. No sign-up needed.'}
        </p>

        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Weekend camping trip"
              className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination (optional)</label>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="Yosemite National Park"
              className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {createError && <p className="text-red-600 text-sm">{createError}</p>}

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50 active:bg-blue-700"
          >
            {creating ? 'Creating…' : 'Create Trip'}
          </button>
        </form>
      </div>
    </main>
  )
}
