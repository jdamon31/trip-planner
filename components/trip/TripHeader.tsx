import type { Trip } from '@/lib/supabase/types'
import { format } from 'date-fns'

interface TripHeaderProps {
  trip: Trip
}

export function TripHeader({ trip }: TripHeaderProps) {
  return (
    <div className="bg-white rounded-xl border p-4 mb-4">
      <h2 className="text-xl font-bold">{trip.name}</h2>
      {trip.destination && (
        <p className="text-gray-500 text-sm mt-0.5">📍 {trip.destination}</p>
      )}
      {trip.confirmed_date && (
        <div className="mt-2 inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
          <span>✅</span>
          <span>{format(new Date(trip.confirmed_date), 'MMMM d, yyyy')}</span>
        </div>
      )}
    </div>
  )
}
