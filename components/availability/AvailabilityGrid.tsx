'use client'
import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { AvailabilityCell } from './AvailabilityCell'
import { BestDateBanner } from './BestDateBanner'
import { DateRangeProposer } from './DateRangeProposer'
import { getBestDates } from '@/lib/utils/availability'
import { getSupabaseClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { Member, Availability, AvailabilityStatus } from '@/lib/supabase/types'

type AvailabilityGridProps = {
  tripId: string
  members: Member[]
  rows: Availability[]
  dates: Date[]
  currentMemberId: string
  confirmedDates: string[]
  onExpandRange: (start: string, end: string) => void
  onRemoveDate: (dateStr: string, memberIds: string[]) => Promise<void>
}

export function AvailabilityGrid({
  tripId,
  members,
  rows,
  dates,
  currentMemberId,
  confirmedDates,
  onExpandRange,
  onRemoveDate,
}: AvailabilityGridProps) {
  const [pendingDeleteDate, setPendingDeleteDate] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const bestDates = useMemo(() => getBestDates(rows, members.length), [rows, members.length])
  const bestDateSet = useMemo(() => new Set(bestDates.map(d => d.date)), [bestDates])
  const confirmedDateSet = useMemo(() => new Set(confirmedDates), [confirmedDates])

  const statusMap = useMemo(() => {
    const map = new Map<string, Map<string, AvailabilityStatus>>()
    for (const row of rows) {
      if (!map.has(row.member_id)) map.set(row.member_id, new Map())
      map.get(row.member_id)!.set(row.date, row.status)
    }
    return map
  }, [rows])

  async function handleCellClick(memberId: string, date: string, currentStatus: AvailabilityStatus | null) {
    const next: AvailabilityStatus = !currentStatus || currentStatus === 'unavailable'
      ? 'available'
      : currentStatus === 'available' ? 'maybe' : 'unavailable'
    const supabase = getSupabaseClient()
    await supabase.from('availability').upsert(
      { member_id: memberId, date, status: next },
      { onConflict: 'member_id,date' }
    )
  }

  async function handleConfirmDate(date: string) {
    const supabase = getSupabaseClient()
    const isConfirmed = confirmedDates.includes(date)
    const newDates = isConfirmed
      ? confirmedDates.filter(d => d !== date)
      : [...confirmedDates, date].sort()
    await supabase.from('trips').update({ confirmed_dates: newDates }).eq('id', tripId)
  }

  async function handleUnconfirmDate(date: string) {
    const supabase = getSupabaseClient()
    await supabase.from('trips').update({ confirmed_dates: confirmedDates.filter(d => d !== date) }).eq('id', tripId)
  }

  async function handleDeleteDate() {
    if (!pendingDeleteDate) return
    setDeleting(true)
    await onRemoveDate(pendingDeleteDate, members.map(m => m.id))
    setDeleting(false)
    setPendingDeleteDate(null)
  }

  function startLongPress(dateKey: string) {
    const timer = setTimeout(() => setPendingDeleteDate(dateKey), 500)
    setPressTimer(timer)
  }

  function cancelLongPress() {
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
  }

  const confirmedBanner = confirmedDates.length > 0 && (
    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Confirmed dates</p>
      <div className="space-y-1.5">
        {confirmedDates.map(date => (
          <div key={date} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span className="font-semibold text-green-800 text-sm">
                {format(parseISO(date), 'MMMM d, yyyy')}
              </span>
            </div>
            <button
              onClick={() => handleUnconfirmDate(date)}
              className="text-xs text-green-700 border border-green-300 rounded-full px-2.5 py-1 active:bg-green-100"
            >
              Unset
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  if (dates.length === 0) {
    return (
      <div>
        {confirmedBanner}
        <DateRangeProposer onPropose={onExpandRange} />
        <p className="text-sm text-gray-400 text-center py-8">No dates proposed yet</p>
      </div>
    )
  }

  return (
    <div>
      {confirmedBanner}
      <BestDateBanner bestDates={bestDates} memberCount={members.length} confirmedDates={confirmedDates} onConfirm={handleConfirmDate} />
      <DateRangeProposer onPropose={onExpandRange} />

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-50 z-10 min-w-[80px] text-left text-xs font-medium text-gray-500 pb-2 pr-3">
                Member
              </th>
              {dates.map(date => {
                const key = format(date, 'yyyy-MM-dd')
                const isConfirmed = confirmedDateSet.has(key)
                const isBest = bestDateSet.has(key)
                return (
                  <th
                    key={key}
                    className={`text-center pb-2 px-1 relative group cursor-pointer select-none ${
                      isConfirmed ? 'bg-green-50' : isBest ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleConfirmDate(key)}
                    onTouchStart={() => startLongPress(key)}
                    onTouchEnd={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                  >
                    <div className="text-xs font-medium text-gray-500">{format(date, 'MMM')}</div>
                    <div className={`text-sm font-bold ${isConfirmed ? 'text-green-700' : 'text-gray-800'}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="text-xs leading-none mt-0.5 h-3">
                      {isConfirmed && <span className="text-green-600">✓</span>}
                    </div>
                    {/* Desktop: show ✕ on hover */}
                    <button
                      onClick={e => { e.stopPropagation(); setPendingDeleteDate(key) }}
                      className="hidden group-hover:flex absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-xs leading-none"
                      aria-label={`Remove ${format(date, 'MMM d')}`}
                    >
                      ✕
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id}>
                <td className="sticky left-0 bg-white z-10 text-sm font-medium text-gray-700 pr-3 py-1 whitespace-nowrap">
                  {member.display_name}
                  {member.id === currentMemberId && (
                    <span className="text-xs text-blue-500 ml-1">(you)</span>
                  )}
                </td>
                {dates.map(date => {
                  const dateKey = format(date, 'yyyy-MM-dd')
                  const status = statusMap.get(member.id)?.get(dateKey) ?? null
                  const isConfirmedCol = confirmedDateSet.has(dateKey)
                  return (
                    <td key={dateKey} className={`px-1 py-1 ${isConfirmedCol ? 'bg-green-50' : bestDateSet.has(dateKey) ? 'bg-blue-50' : ''}`}>
                      <AvailabilityCell
                        status={status}
                        isCurrentUser={member.id === currentMemberId}
                        isBestDate={bestDateSet.has(dateKey)}
                        onClick={() => handleCellClick(member.id, dateKey, status)}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BottomSheet
        open={pendingDeleteDate !== null}
        onClose={() => setPendingDeleteDate(null)}
        title="Remove date?"
      >
        <div className="space-y-4 pb-2">
          <p className="text-sm text-gray-600">
            Remove <strong>{pendingDeleteDate ? format(parseISO(pendingDeleteDate), 'MMMM d, yyyy') : ''}</strong> from the trip?
            Everyone's availability for this date will be deleted.
          </p>
          <button
            onClick={handleDeleteDate}
            disabled={deleting}
            className="w-full bg-red-600 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50 active:bg-red-700"
          >
            {deleting ? 'Removing…' : 'Remove date'}
          </button>
          <button
            onClick={() => setPendingDeleteDate(null)}
            className="w-full border rounded-lg py-3 text-sm"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
