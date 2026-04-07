import type { Trip } from '@/lib/supabase/types'
import { format, parseISO } from 'date-fns'
import { TripPhoto } from './TripPhoto'
import { TripMenu } from './TripMenu'

type TripHeaderProps = {
  trip: Trip
  isCreator: boolean
  onLeave: () => Promise<void>
  onDelete: () => Promise<void>
}

export function TripHeader({ trip, isCreator, onLeave, onDelete }: TripHeaderProps) {
  return (
    <div className="bg-white rounded-xl border p-4 mb-4">
      <div className="flex items-start gap-3">
        <TripPhoto tripId={trip.id} photoUrl={trip.photo_url} tripName={trip.name} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold leading-tight">{trip.name}</h2>
          {trip.destination && (
            <p className="text-gray-500 text-sm mt-0.5">📍 {trip.destination}</p>
          )}
          {trip.confirmed_date && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
              <span>✅</span>
              <span>{format(parseISO(trip.confirmed_date!), 'MMMM d, yyyy')}</span>
            </div>
          )}
        </div>
        <TripMenu
          tripName={trip.name}
          isCreator={isCreator}
          onLeave={onLeave}
          onDelete={onDelete}
        />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <a href="/" className="text-sm text-blue-600 font-medium">← My trips</a>
        <a href="/" className="text-sm text-gray-400">+ Create new trip</a>
      </div>
    </div>
  )
}
