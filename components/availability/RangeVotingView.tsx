'use client'
import { useMemo } from 'react'
import { format, parseISO, eachDayOfInterval, isSameMonth, differenceInCalendarDays } from 'date-fns'
import type { Member, DateRangeEntry, RangeVote, RangeVoteStatus } from '@/lib/supabase/types'
import { DateRangeProposer } from './DateRangeProposer'
import { RangeCard } from './RangeCard'

function formatShortRange(start: string, end: string) {
  const s = parseISO(start)
  const e = parseISO(end)
  return isSameMonth(s, e)
    ? `${format(s, 'MMM d')} – ${format(e, 'd')}`
    : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`
}

interface RangeVotingViewProps {
  ranges: DateRangeEntry[]
  votes: RangeVote[]
  members: Member[]
  currentMemberId: string
  isCreator: boolean
  confirmedDates: string[]
  onAddRange: (start: string, end: string) => Promise<void>
  onRemoveRange: (start: string, end: string) => Promise<void>
  onVote: (rangeStart: string, rangeEnd: string, status: RangeVoteStatus, caveat: string | null) => Promise<void>
  onConfirmDates: (dates: string[]) => Promise<void>
  onUnconfirmDates: (dates: string[]) => Promise<void>
}

export function RangeVotingView({
  ranges, votes, members, currentMemberId, isCreator, confirmedDates,
  onAddRange, onRemoveRange, onVote, onConfirmDates, onUnconfirmDates,
}: RangeVotingViewProps) {
  const confirmedSet = useMemo(() => new Set(confirmedDates), [confirmedDates])

  function isRangeConfirmed(range: DateRangeEntry) {
    if (confirmedDates.length === 0) return false
    const days = eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) })
    return days.every(d => confirmedSet.has(format(d, 'yyyy-MM-dd')))
  }

  const sortedRanges = useMemo(() => (
    [...ranges].sort((a, b) => {
      const aConf = isRangeConfirmed(a)
      const bConf = isRangeConfirmed(b)
      if (aConf && !bConf) return -1
      if (!aConf && bConf) return 1
      return a.start.localeCompare(b.start)
    })
  ), [ranges, confirmedDates])

  const confirmedRange = sortedRanges.find(isRangeConfirmed)

  const bestRangeKey = useMemo(() => {
    if (ranges.length === 0) return null
    let best = { key: '', score: 0 }
    for (const range of ranges) {
      const rangeVotes = votes.filter(v => v.range_start === range.start && v.range_end === range.end)
      const score = rangeVotes.reduce((s, v) => s + (v.status === 'yes' ? 2 : v.status === 'partial' ? 1 : 0), 0)
      if (score > best.score) best = { key: `${range.start}-${range.end}`, score }
    }
    return best.score > 0 ? best.key : null
  }, [ranges, votes])

  return (
    <div>
      {/* Trip dates banner */}
      {confirmedRange && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Trip dates set</p>
            <p className="font-semibold text-green-900 text-sm mt-0.5">
              {formatShortRange(confirmedRange.start, confirmedRange.end)}
              <span className="font-normal text-green-600">
                {' · '}{differenceInCalendarDays(parseISO(confirmedRange.end), parseISO(confirmedRange.start)) + 1} days
              </span>
            </p>
          </div>
        </div>
      )}

      <DateRangeProposer onPropose={onAddRange} />

      {ranges.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-gray-700">No dates proposed yet</p>
          <p className="text-sm text-gray-400 mt-1">Tap above to propose a date range</p>
        </div>
      ) : (
        sortedRanges.map(range => (
          <RangeCard
            key={`${range.start}-${range.end}`}
            range={range}
            votes={votes.filter(v => v.range_start === range.start && v.range_end === range.end)}
            members={members}
            currentMemberId={currentMemberId}
            isCreator={isCreator}
            isBestMatch={`${range.start}-${range.end}` === bestRangeKey}
            confirmedDates={confirmedDates}
            onVote={(status, caveat) => onVote(range.start, range.end, status, caveat)}
            onRemove={() => onRemoveRange(range.start, range.end)}
            onConfirmRange={onConfirmDates}
            onUnconfirmRange={onUnconfirmDates}
          />
        ))
      )}
    </div>
  )
}
