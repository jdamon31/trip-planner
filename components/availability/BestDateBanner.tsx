import type { RankedDate } from '@/lib/utils/availability'
import { format, parseISO } from 'date-fns'

interface BestDateBannerProps {
  bestDates: RankedDate[]
  memberCount: number
  confirmedDates: string[]
  onConfirm: (date: string) => void
}

export function BestDateBanner({ bestDates, memberCount, confirmedDates, onConfirm }: BestDateBannerProps) {
  if (bestDates.length === 0 || memberCount === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Best Dates</p>
      {bestDates.map(d => {
        const isConfirmed = confirmedDates.includes(d.date)
        return (
          <div key={d.date} className="flex items-center justify-between py-1.5">
            <div>
              <span className="font-semibold text-gray-800">
                {format(parseISO(d.date), 'MMM d')}
              </span>
              {d.allAvailable ? (
                <span className="ml-2 text-green-600 text-sm font-medium">🎉 Everyone&apos;s free!</span>
              ) : (
                <span className="ml-2 text-gray-500 text-sm">
                  {d.availableCount}/{memberCount} available
                  {d.maybeCount > 0 && `, ${d.maybeCount} maybe`}
                </span>
              )}
            </div>
            <button
              onClick={() => onConfirm(d.date)}
              className={`text-xs font-medium rounded-full px-2.5 py-1 ml-3 border ${
                isConfirmed
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'text-blue-600 border-blue-300 active:bg-blue-100'
              }`}
            >
              {isConfirmed ? '✓ Set' : 'Set date'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
