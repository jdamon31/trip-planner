'use client'
import { useState } from 'react'

interface AddItineraryFormProps {
  onSubmit: (item: { day: string | null; time: string | null; activity: string }) => Promise<void>
}

export function AddItineraryForm({ onSubmit }: AddItineraryFormProps) {
  const [activity, setActivity] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activity.trim()) return
    setLoading(true)
    await onSubmit({ activity: activity.trim(), day: day || null, time: time || null })
    setActivity('')
    setDay('')
    setTime('')
    setOpen(false)
    setLoading(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 font-medium mb-4 active:bg-gray-50">
        + Add itinerary item
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
      <input type="text" value={activity} onChange={e => setActivity(e.target.value)}
        placeholder="Activity or note" autoFocus
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
      <div className="flex gap-2">
        <input type="date" value={day} onChange={e => setDay(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading || !activity.trim()}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="flex-1 border rounded-lg py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  )
}
