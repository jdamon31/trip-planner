'use client'
import { useState, useRef } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  format, addMonths, subMonths, parseISO,
} from 'date-fns'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface DateRangeProposerProps {
  onPropose: (start: string, end: string) => void
}

export function DateRangeProposer({ onPropose }: DateRangeProposerProps) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))
  const [startDate, setStartDate] = useState<string | null>(null)

  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 50) return // ignore small movements
    setViewMonth(m => delta < 0 ? addMonths(m, 1) : subMonths(m, 1))
  }

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const leadingBlanks = getDay(startOfMonth(viewMonth))

  function handleDayClick(dateStr: string) {
    if (!startDate || dateStr < startDate) {
      // First tap, or tapped before existing start → set as new start
      setStartDate(dateStr)
    } else if (dateStr === startDate) {
      // Same day → single-day range
      onPropose(dateStr, dateStr)
      reset()
    } else {
      // Second tap after start → submit range
      onPropose(startDate, dateStr)
      reset()
    }
  }

  function reset() {
    setStartDate(null)
    setOpen(false)
  }

  function dayClass(dateStr: string) {
    if (dateStr === startDate) {
      return 'bg-blue-600 text-white font-semibold'
    }
    return 'text-gray-800 active:bg-blue-100'
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600 font-medium mb-3 flex items-center gap-1"
      >
        + Propose dates
      </button>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-4 mb-4 select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center text-gray-400 active:text-gray-700 rounded-full active:bg-gray-100"
        >
          ‹
        </button>
        <span className="font-semibold text-sm text-gray-800">{format(viewMonth, 'MMMM yyyy')}</span>
        <button
          type="button"
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center text-gray-400 active:text-gray-700 rounded-full active:bg-gray-100"
        >
          ›
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-center text-gray-400 mb-3">
        {startDate
          ? `Start: ${format(parseISO(startDate), 'MMM d')} — now tap the end date`
          : 'Tap a start date'}
      </p>

      {/* Day-of-week headers + grid (swipeable) */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 pb-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDayClick(dateStr)}
              className={`mx-auto w-9 h-9 flex items-center justify-center text-sm rounded-full transition-colors ${dayClass(dateStr)}`}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
      </div>{/* end swipeable */}

      <button
        type="button"
        onClick={reset}
        className="w-full text-sm text-gray-400 pt-3 text-center active:text-gray-600"
      >
        Cancel
      </button>
    </div>
  )
}
