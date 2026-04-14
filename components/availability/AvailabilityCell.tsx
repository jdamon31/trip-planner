import type { AvailabilityStatus } from '@/lib/supabase/types'

interface AvailabilityCellProps {
  status: AvailabilityStatus | null
  isCurrentUser: boolean
  isBestDate: boolean
  onClick: () => void
}

const STATUS_STYLES: Record<AvailabilityStatus, string> = {
  available:   'bg-green-500 text-white border-green-600',
  maybe:       'bg-amber-300 text-amber-900 border-amber-400',
  unavailable: 'bg-white text-gray-300 border-gray-200',
}

const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available:   '✓',
  maybe:       '~',
  unavailable: '✕',
}

export function AvailabilityCell({ status, isCurrentUser, isBestDate, onClick }: AvailabilityCellProps) {
  const displayStatus = status ?? 'unavailable'

  return (
    <button
      onClick={isCurrentUser ? onClick : undefined}
      className={`
        min-w-[44px] min-h-[44px] flex items-center justify-center text-base font-bold border rounded
        ${STATUS_STYLES[displayStatus]}
        ${isBestDate ? 'ring-2 ring-blue-400' : ''}
        ${isCurrentUser ? 'cursor-pointer active:scale-95' : 'cursor-default'}
        transition-all
      `}
      aria-label={`${displayStatus}${isCurrentUser ? ' — tap to change' : ''}`}
    >
      {STATUS_ICONS[displayStatus]}
    </button>
  )
}
