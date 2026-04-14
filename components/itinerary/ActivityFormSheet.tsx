'use client'
import { useState, useEffect } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { ItineraryItem } from '@/lib/supabase/types'

type FormData = {
  activity: string
  time: string | null
  description: string | null
  location: string | null
}

type ActivityFormSheetProps = {
  open: boolean
  onClose: () => void
  dayNumber: number
  initial?: ItineraryItem
  itineraryDays?: number
  onSubmit: (data: FormData) => Promise<void>
  onMove?: (newDayNumber: number) => Promise<void>
}

const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

function parseTime(t: string): { hour: string; minute: string; ampm: 'AM' | 'PM' } {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  // snap minute to nearest 5-min slot
  const rawMin = parseInt(mStr ?? '0', 10)
  const snapped = Math.round(rawMin / 5) * 5
  const minute = String(snapped >= 60 ? 55 : snapped).padStart(2, '0')
  return { hour: String(hour12), minute, ampm }
}

function toTime24(hour: string, minute: string, ampm: 'AM' | 'PM'): string {
  let h = parseInt(hour, 10)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${minute}`
}

export function ActivityFormSheet({ open, onClose, dayNumber, initial, itineraryDays, onSubmit, onMove }: ActivityFormSheetProps) {
  const [activity, setActivity] = useState('')
  const [timeEnabled, setTimeEnabled] = useState(false)
  const [hour, setHour] = useState('8')
  const [minute, setMinute] = useState('00')
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [selectedDay, setSelectedDay] = useState(dayNumber)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open) return
    setActivity(initial?.activity ?? '')
    setDescription(initial?.description ?? '')
    setLocation(initial?.location ?? '')
    setSelectedDay(dayNumber)
    setSubmitError('')
    if (initial?.time) {
      const parsed = parseTime(initial.time)
      setTimeEnabled(true)
      setHour(parsed.hour)
      setMinute(parsed.minute)
      setAmpm(parsed.ampm)
    } else {
      setTimeEnabled(false)
      setHour('8')
      setMinute('00')
      setAmpm('AM')
    }
  }, [open, initial])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activity.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await onSubmit({
        activity: activity.trim(),
        time: timeEnabled ? toTime24(hour, minute, ampm) : null,
        description: description.trim() || null,
        location: location.trim() || null,
      })
      if (onMove && selectedDay !== dayNumber) {
        await onMove(selectedDay)
      }
    } catch (err: any) {
      setSubmitError(err.message ?? 'Failed to save')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onClose()
  }

  const selectCls = 'flex-1 border border-gray-200 rounded-xl px-2 py-2.5 text-base bg-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none'

  return (
    <BottomSheet open={open} onClose={onClose} title={initial ? 'Edit Activity' : `Add Activity — Day ${dayNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4 pb-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={activity}
            onChange={e => setActivity(e.target.value)}
            placeholder="Hike to the summit"
            className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Time (optional)</label>
            <button
              type="button"
              onClick={() => setTimeEnabled(v => !v)}
              className={`text-sm font-medium px-3 py-1 rounded-full border transition-colors ${
                timeEnabled
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'text-gray-400 border-gray-200 active:bg-gray-50'
              }`}
            >
              {timeEnabled ? 'Remove time' : '+ Add time'}
            </button>
          </div>
          {timeEnabled && (
            <div className="flex gap-2">
              <select value={hour} onChange={e => setHour(e.target.value)} className={selectCls}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select value={minute} onChange={e => setMinute(e.target.value)} className={selectCls}>
                {MINUTES.map(m => <option key={m} value={m}>:{m}</option>)}
              </select>
              <select value={ampm} onChange={e => setAmpm(e.target.value as 'AM' | 'PM')} className={selectCls}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Bring sunscreen and plenty of water"
            rows={3}
            className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Half Dome trailhead"
            className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {initial && onMove && itineraryDays && itineraryDays > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: itineraryDays }, (_, i) => i + 1).map(d => (
                <button
                  key={d}
                  type="button"
                  disabled={submitting}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    d === selectedDay
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 active:bg-gray-50'
                  }`}
                >
                  Day {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
        <button
          type="submit"
          disabled={submitting || !activity.trim()}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50 active:bg-blue-700"
        >
          {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Add Activity'}
        </button>
      </form>
    </BottomSheet>
  )
}
