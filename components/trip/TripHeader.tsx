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
    <div className="bg-white rounded-xl border mb-4 overflow-hidden" style={{ borderColor: 'rgba(62,44,35,0.08)' }}>
      <div className="p-4 flex items-start gap-3">
        <TripPhoto tripId={trip.id} photoUrl={trip.photo_url} tripName={trip.name} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold leading-tight" style={{ color: '#3E2C23' }}>{trip.name}</h2>
          {trip.destination && (
            <p className="text-sm mt-0.5" style={{ color: 'rgba(62,44,35,0.5)' }}>📍 {trip.destination}</p>
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
      <div className="px-4 pb-3 flex items-center gap-4 border-t pt-3" style={{ borderColor: 'rgba(62,44,35,0.06)' }}>
        <a href="/" className="text-sm font-medium" style={{ color: '#6B8E23' }}>← My trips</a>
        <a href="/" className="text-sm" style={{ color: 'rgba(62,44,35,0.35)' }}>+ New trip</a>
      </div>

      <BottomSheet open={editing} onClose={() => setEditing(false)} title="Edit trip">
        <form onSubmit={handleSave} className="space-y-4 pb-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(62,44,35,0.45)' }}>Trip name *</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
              autoFocus
              className="w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none transition-colors"
              style={{ borderColor: 'rgba(62,44,35,0.1)', background: 'white', color: '#3E2C23' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(62,44,35,0.45)' }}>Destination (optional)</label>
            <input
              type="text"
              value={editDest}
              onChange={e => setEditDest(e.target.value)}
              placeholder="Yosemite National Park"
              className="w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none transition-colors"
              style={{ borderColor: 'rgba(62,44,35,0.1)', background: 'white', color: '#3E2C23' }}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !editName.trim()}
            className="w-full rounded-xl py-3 font-bold text-base disabled:opacity-40"
            style={{ background: '#3E2C23', color: '#FAF8EF' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
