'use client'
import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface TripNotesProps {
  tripId: string
  initialNotes: string | null
}

export function TripNotes({ tripId, initialNotes }: TripNotesProps) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    setSaving(true)
    const supabase = getSupabaseClient()
    await supabase.from('trips').update({ description: notes || null }).eq('id', tripId)
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-gray-700">Notes</h3>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes about the trip…"
        rows={3}
        className="w-full text-sm text-gray-700 resize-none focus:outline-none placeholder-gray-400"
      />
    </div>
  )
}
