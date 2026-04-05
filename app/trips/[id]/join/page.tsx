'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMemberFromStorage, saveMemberToStorage } from '@/hooks/useMember'

export default function JoinPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const tripId = params.id
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const existing = getMemberFromStorage(tripId)
    if (existing) {
      router.replace(`/trips/${tripId}`)
    }
  }, [tripId, router])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Join the trip</h1>
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
            {loading ? 'Joining...' : "Let's go"}
          </button>
        </form>
      </div>
    </main>
  )
}
