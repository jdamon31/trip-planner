'use client'
import { useItinerary } from '@/hooks/useItinerary'
import { DaySection } from './DaySection'

interface ItineraryListProps {
  tripId: string
  confirmedDates: string[]
  memberName: string
}

export function ItineraryList({ tripId, confirmedDates, memberName }: ItineraryListProps) {
  const { items, itineraryDays, addItem, updateItem, deleteItem, addDay, moveItem } = useItinerary(tripId)

  const days = Array.from({ length: itineraryDays }, (_, i) => i + 1)

  return (
    <div>
      {days.map(dayNum => (
        <DaySection
          key={dayNum}
          dayNumber={dayNum}
          confirmedDates={confirmedDates}
          items={items.filter(i => i.day_number === dayNum)}
          itineraryDays={itineraryDays}
          onAdd={(data) => addItem({ ...data, day_number: dayNum }, memberName)}
          onEdit={updateItem}
          onMove={moveItem}
          onDelete={deleteItem}
        />
      ))}
      <button
        onClick={addDay}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 font-medium active:bg-gray-50"
      >
        + Add Day
      </button>
    </div>
  )
}
