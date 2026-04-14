'use client'
import { useState } from 'react'
import type { Trip } from '@/lib/supabase/types'
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns'
import { TripPhoto } from './TripPhoto'
import { TripMenu } from './TripMenu'
import { BottomSheet } from '@/components/ui/BottomSheet'

function formatConfirmedRange(dates: string[]): string {
  const sorted = [...dates].sort()
  const s = parseISO(sorted[0])
  const e = parseISO(sorted[sorted.length - 1])
  if (sorted.length === 1) return format(s, 'MMM d, yyyy')
  if (isSameMonth(s, e)) return `${format(s, 'MMM d')}–${format(e, 'd, yyyy')}`
  if (isSameYear(s, e)) return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
  return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`
}

type TripHeaderProps = {
  trip: Trip
  isCreator: boolean
  onLeave: () => Promise<void>
  onDelete: () => Promise<void>
}

export function TripHeader({ trip, isCreator, onLeave, onDelete }: TripHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDest, setEditDest] = useState('')
  const [saving, setSaving] = useState(false)

  function openEdit() {
    setEditName(trip.name)
    setEditDest(trip.destination ?? '')
    setEditing(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) return
    setSaving(true)
    await fetch(`/api/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, destination: editDest }),
    })
    setSaving(false)
    setEditing(false)
    // useTrip's real-time listener picks up the UPDATE automatically
  }

  return (
    <div className="bg-white rounded-xl border p-4 mb-4">
      <div className="flex items-start gap-3">
        <TripPhoto tripId={trip.id} photoUrl={trip.photo_url} tripName={trip.name} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold leading-tight">{trip.name}</h2>
          {trip.destination && (
            <p className="text-gray-500 text-sm mt-0.5">📍 {trip.destination}</p>
          )}
          {trip.confirmed_dates?.length > 0 && (
            <div className="mt-2">
              <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                <span>✅</span>
                <span>{formatConfirmedRange(trip.confirmed_dates)}</span>
              </div>
            </div>
          )}
        </div>
        <TripMenu
          tripName={trip.name}
          isCreator={isCreator}
          onLeave={onLeave}
          onDelete={onDelete}
          onEdit={openEdit}
        />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <a href="/" className="text-sm text-blue-600 font-medium">← My trips</a>
        <a href="/" className="text-sm text-gray-400">+ Create new trip</a>
      </div>

      <BottomSheet open={editing} onClose={() => setEditing(false)} title="Edit trip">
        <form onSubmit={handleSave} className="space-y-4 pb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip name *</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
              autoFocus
              className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination (optional)</label>
            <input
              type="text"
              value={editDest}
              onChange={e => setEditDest(e.target.value)}
              placeholder="Yosemite National Park"
              className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !editName.trim()}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50 active:bg-blue-700"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
