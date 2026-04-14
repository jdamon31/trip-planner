'use client'
import { useState } from 'react'
import { format, parseISO, eachDayOfInterval, isSameMonth, differenceInCalendarDays } from 'date-fns'
import type { Member, DateRangeEntry, RangeVote, RangeVoteStatus } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'

function formatRangeHeader(start: string, end: string) {
  const s = parseISO(start)
  const e = parseISO(end)
  const days = differenceInCalendarDays(e, s) + 1
  const dateStr = isSameMonth(s, e)
    ? `${format(s, 'MMM d')} – ${format(e, 'd')}`
    : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`
  const weekdays = days <= 8 ? `${format(s, 'EEE')} – ${format(e, 'EEE')} · ` : ''
  const dayCount = days === 1 ? '1 day' : `${days} days`
  return { dateStr, detail: `${weekdays}${dayCount}` }
}

interface RangeCardProps {
  range: DateRangeEntry
  votes: RangeVote[]
  members: Member[]
  currentMemberId: string
  isCreator: boolean
  isBestMatch: boolean
  confirmedDates: string[]
  onVote: (status: RangeVoteStatus, caveat: string | null) => Promise<void>
  onRemove: () => Promise<void>
  onConfirmRange: (dates: string[]) => Promise<void>
  onUnconfirmRange: (dates: string[]) => Promise<void>
}

export function RangeCard({
  range, votes, members, currentMemberId, isCreator, isBestMatch, confirmedDates,
  onVote, onRemove, onConfirmRange, onUnconfirmRange,
}: RangeCardProps) {
  const myVote = votes.find(v => v.member_id === currentMemberId)
  const [caveatText, setCaveatText] = useState(myVote?.caveat ?? '')
  const [savingCaveat, setSavingCaveat] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmChange, setConfirmChange] = useState(false)

  const { dateStr, detail } = formatRangeHeader(range.start, range.end)

  const rangeDates = eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) })
    .map(d => format(d, 'yyyy-MM-dd'))
  const confirmedSet = new Set(confirmedDates)
  const isConfirmed = rangeDates.length > 0 && rangeDates.every(d => confirmedSet.has(d))
  const hasOtherConfirmed = confirmedDates.length > 0 && !isConfirmed

  // Format the currently-set trip dates for the confirmation dialog
  const currentTripDatesLabel = hasOtherConfirmed
    ? formatRangeHeader(confirmedDates[0], confirmedDates[confirmedDates.length - 1]).dateStr
    : ''

  const yesVotes     = votes.filter(v => v.status === 'yes')
  const partialVotes = votes.filter(v => v.status === 'partial')
  const noVotes      = votes.filter(v => v.status === 'no')
  const notVotedCount = members.length - votes.length
  const memberMap    = new Map(members.map(m => [m.id, m.display_name]))

  async function handleVote(status: RangeVoteStatus) {
    if (myVote?.status === status) return
    if (status !== 'partial') setCaveatText('')
    await onVote(status, status === 'partial' ? (caveatText || null) : null)
  }

  async function handleCaveatBlur() {
    if (!myVote || myVote.status !== 'partial') return
    if ((caveatText.trim() || null) === (myVote.caveat || null)) return
    setSavingCaveat(true)
    await onVote('partial', caveatText || null)
    setSavingCaveat(false)
  }

  function handleSetDates() {
    if (hasOtherConfirmed) {
      setConfirmChange(true)
    } else {
      onConfirmRange(rangeDates)
    }
  }

  const btn = (active: boolean, activeStyle: string) =>
    `flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
      active ? activeStyle : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
    }`

  return (
    <div className={`bg-white rounded-2xl border mb-3 overflow-hidden ${isConfirmed ? 'border-green-300' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`px-4 py-3.5 flex items-start justify-between gap-2 ${isConfirmed ? 'bg-green-50' : ''}`}>
        <div className="flex-1 min-w-0">
          {isConfirmed && <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-0.5">✅ Trip dates</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-base leading-tight">{dateStr}</p>
            {isBestMatch && !isConfirmed && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                ✨ Best match
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
        </div>
        {isCreator && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-gray-300 p-1 active:text-gray-500 shrink-0 mt-0.5"
            aria-label="Remove range"
          >
            ✕
          </button>
        )}
      </div>

      {/* Voting */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 font-medium mb-2">Your response</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => handleVote('yes')}
            className={btn(myVote?.status === 'yes', 'bg-green-500 text-white border-green-500')}>
            ✓ I'm in
          </button>
          <button type="button" onClick={() => handleVote('partial')}
            className={btn(myVote?.status === 'partial', 'bg-amber-400 text-white border-amber-400')}>
            ~ Partial
          </button>
          <button type="button" onClick={() => handleVote('no')}
            className={btn(myVote?.status === 'no', 'bg-red-500 text-white border-red-500')}>
            ✗ Can't
          </button>
        </div>

        {myVote?.status === 'partial' && (
          <div className="mt-2.5">
            <input
              type="text"
              value={caveatText}
              onChange={e => setCaveatText(e.target.value)}
              onBlur={handleCaveatBlur}
              placeholder="Which part can you make? (optional)"
              className="w-full border border-amber-200 bg-amber-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-amber-400"
            />
            {savingCaveat && <p className="text-xs text-gray-400 mt-1 ml-1">Saving…</p>}
          </div>
        )}
      </div>

      {/* Responses */}
      {votes.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-medium">Responses</p>
            <p className="text-xs text-gray-400">
              {[
                yesVotes.length > 0 && `${yesVotes.length} in`,
                partialVotes.length > 0 && `${partialVotes.length} partial`,
                noVotes.length > 0 && `${noVotes.length} can't`,
                notVotedCount > 0 && `${notVotedCount} pending`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...yesVotes, ...partialVotes, ...noVotes].map(v => (
              <VoteChip
                key={v.member_id}
                name={v.member_id === currentMemberId ? 'You' : (memberMap.get(v.member_id) ?? 'Unknown')}
                status={v.status}
                caveat={v.caveat}
              />
            ))}
          </div>
        </div>
      )}

      {/* Creator confirm/unconfirm */}
      {isCreator && (
        <div className="px-4 py-3 border-t border-gray-100">
          {isConfirmed ? (
            <button
              onClick={() => onUnconfirmRange(rangeDates)}
              className="text-sm text-green-700 font-medium border border-green-200 rounded-xl px-4 py-2 active:bg-green-50"
            >
              Unset trip dates
            </button>
          ) : (
            <button
              onClick={handleSetDates}
              className="text-sm text-blue-600 font-medium border border-blue-200 rounded-xl px-4 py-2 active:bg-blue-50"
            >
              ✓ Set as trip dates
            </button>
          )}
        </div>
      )}

      {/* Change dates confirmation */}
      <BottomSheet open={confirmChange} onClose={() => setConfirmChange(false)} title="Change trip dates?">
        <div className="space-y-4 pb-2">
          <p className="text-sm text-gray-600">
            Trip dates are currently set to <strong>{currentTripDatesLabel}</strong>.
            Change them to <strong>{dateStr}</strong>?
          </p>
          <button
            onClick={async () => { await onConfirmRange(rangeDates); setConfirmChange(false) }}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-sm active:bg-blue-700"
          >
            Yes, update trip dates
          </button>
          <button
            onClick={() => setConfirmChange(false)}
            className="w-full border rounded-lg py-3 text-sm text-gray-700"
          >
            Keep current dates
          </button>
        </div>
      </BottomSheet>

      {/* Delete range confirmation */}
      <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Remove date range?">
        <div className="space-y-4 pb-2">
          <p className="text-sm text-gray-600">
            Remove <strong>{dateStr}</strong>? All votes for this range will be deleted.
          </p>
          <button
            onClick={async () => { await onRemove(); setConfirmDelete(false) }}
            className="w-full bg-red-600 text-white rounded-lg py-3 font-semibold text-sm active:bg-red-700"
          >
            Remove range
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="w-full border rounded-lg py-3 text-sm"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

function VoteChip({ name, status, caveat }: { name: string; status: RangeVoteStatus; caveat: string | null }) {
  const [expanded, setExpanded] = useState(false)

  const styles: Record<RangeVoteStatus, string> = {
    yes:     'bg-green-100 text-green-800',
    partial: 'bg-amber-100 text-amber-800',
    no:      'bg-red-50 text-red-500',
  }
  const icons: Record<RangeVoteStatus, string> = { yes: '✓', partial: '~', no: '✗' }

  return (
    <button
      type="button"
      onClick={() => caveat && setExpanded(e => !e)}
      className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 font-medium ${styles[status]} ${caveat ? '' : 'cursor-default'}`}
    >
      <span>{icons[status]}</span>
      <span>{name}</span>
      {caveat && (
        <span className="opacity-70">
          · {expanded ? caveat : (caveat.length > 18 ? caveat.slice(0, 18) + '…' : caveat)}
        </span>
      )}
    </button>
  )
}
