import type { AvailabilityStatus } from '@/lib/supabase/types'

interface AvailabilityCellProps {
  status: AvailabilityStatus | null
  isCurrentUser: boolean
  isBestDate: boolean
  onClick: () => void
}

const STATUS_STYLES: Record<AvailabilityStatus, string> = {
  available: 'bg-green-100 text-green-700 border-green-300',
  maybe: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  unavailable: 'bg-gray-100 text-gray-400 border-gray-200',
}

const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available: '✓',
  maybe: '~',
  unavailable: '✕',
}

export function AvailabilityCell({ status, isCurrentUser, isBestDate, onClick }: AvailabilityCellProps) {
  const displayStatus = status ?? 'unavailable'

  return (
    <button
      onClick={isCurrentUser ? onClick : undefined}
      className={`
        min-w-[44px] min-h-[44px] flex items-center justify-center text-sm font-medium border rounded
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
