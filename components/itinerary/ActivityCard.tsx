'use client'
import { useState } from 'react'
import type { ItineraryItem } from '@/lib/supabase/types'
import { ActivityFormSheet } from './ActivityFormSheet'
import { BottomSheet } from '@/components/ui/BottomSheet'

type ActivityCardProps = {
  item: ItineraryItem
  itineraryDays: number
  onEdit: (id: string, data: { activity: string; time: string | null; description: string | null; location: string | null }) => Promise<void>
  onMove: (id: string, newDayNumber: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  const m = mStr?.slice(0, 2) ?? '00'
  return m === '00' ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`
}

export function ActivityCard({ item, itineraryDays, onEdit, onMove, onDelete }: ActivityCardProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="bg-white border rounded-xl p-3 flex items-start gap-3 mb-2">
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => setShowEdit(true)}
        >
          <div className="flex items-baseline gap-2">
            {item.time && (
              <span className="text-sm font-bold text-gray-700 shrink-0">{formatTime(item.time)}</span>
            )}
            <span className="text-sm font-medium text-gray-800">{item.activity}</span>
          </div>
          {item.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
          )}
          {item.location && (
            <p className="text-xs text-gray-400 mt-0.5">📍 {item.location}</p>
          )}
          {item.added_by && (
            <p className="text-xs text-gray-300 mt-1">added by {item.added_by}</p>
          )}
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="text-gray-300 text-sm ml-1 shrink-0 p-1"
          aria-label="Delete activity"
        >
          ✕
        </button>
      </div>

      <ActivityFormSheet
        open={showEdit}
        onClose={() => setShowEdit(false)}
        dayNumber={item.day_number}
        initial={item}
        itineraryDays={itineraryDays}
        onSubmit={async (data) => { await onEdit(item.id, data) }}
        onMove={async (newDay) => { await onMove(item.id, newDay) }}
      />

      <BottomSheet open={showDelete} onClose={() => setShowDelete(false)} title="Delete activity?">
        <div className="space-y-4 pb-2">
          <p className="text-sm text-gray-600">
            This will permanently delete <strong>&ldquo;{item.activity}&rdquo;</strong>.
          </p>
          <button
            onClick={async () => { await onDelete(item.id); setShowDelete(false) }}
            className="w-full bg-red-600 text-white rounded-lg py-3 font-semibold text-sm active:bg-red-700"
          >
            Delete activity
          </button>
          <button
            onClick={() => setShowDelete(false)}
            className="w-full border rounded-lg py-3 text-sm text-gray-700"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
