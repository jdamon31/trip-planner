'use client'
import { useState } from 'react'
import { parseISO, format } from 'date-fns'
import type { ItineraryItem } from '@/lib/supabase/types'
import { ActivityCard } from './ActivityCard'
import { ActivityFormSheet } from './ActivityFormSheet'

function dayLabel(dayNumber: number, confirmedDates: string[]): string {
  const date = confirmedDates[dayNumber - 1]
  if (!date) return `Day ${dayNumber}`
  return format(parseISO(date), 'EEEE, MMMM d')
}

type DaySectionProps = {
  dayNumber: number
  confirmedDates: string[]
  items: ItineraryItem[]
  itineraryDays: number
  onAdd: (data: { activity: string; time: string | null; description: string | null; location: string | null }) => Promise<void>
  onEdit: (id: string, data: { activity: string; time: string | null; description: string | null; location: string | null }) => Promise<void>
  onMove: (id: string, newDayNumber: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function DaySection({ dayNumber, confirmedDates, items, itineraryDays, onAdd, onEdit, onMove, onDelete }: DaySectionProps) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">{dayLabel(dayNumber, confirmedDates)}</h3>

      {items.map(item => (
        <ActivityCard
          key={item.id}
          item={item}
          itineraryDays={itineraryDays}
          onEdit={onEdit}
          onMove={onMove}
          onDelete={onDelete}
        />
      ))}

      {items.length === 0 && (
        <p className="text-xs text-gray-400 py-2 text-center">No activities yet</p>
      )}

      <button
        onClick={() => setShowAdd(true)}
        className="w-full border border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-500 font-medium active:bg-gray-50"
      >
        + Add Activity
      </button>

      <ActivityFormSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        dayNumber={dayNumber}
        onSubmit={async (data) => { await onAdd(data) }}
      />
    </div>
  )
}
