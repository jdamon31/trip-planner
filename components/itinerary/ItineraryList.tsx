'use client'
import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { ItineraryItem } from '@/lib/supabase/types'
import { AddItineraryForm } from './AddItineraryForm'

function SortableItem({ item }: { item: ItineraryItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="bg-white border rounded-xl p-3 flex items-start gap-3 mb-2">
      <button {...attributes} {...listeners}
        className="text-gray-300 mt-0.5 cursor-grab active:cursor-grabbing touch-none select-none">
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{item.activity}</p>
        {(item.day || item.time) && (
          <p className="text-xs text-gray-400 mt-0.5">
            {item.day && format(new Date(item.day), 'MMM d')}
            {item.day && item.time && ' · '}
            {item.time && item.time.slice(0, 5)}
          </p>
        )}
      </div>
    </div>
  )
}

interface ItineraryListProps {
  tripId: string
}

export function ItineraryList({ tripId }: ItineraryListProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('sort_order')
      .then(({ data }) => { if (data) setItems(data as ItineraryItem[]) })
  }, [tripId])

  async function handleAdd(item: { day: string | null; time: string | null; activity: string }) {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('itinerary_items')
      .insert({ trip_id: tripId, ...item, sort_order: items.length })
      .select()
      .single()
    if (data) setItems(prev => [...prev, data as ItineraryItem])
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    const supabase = getSupabaseClient()
    await Promise.all(
      reordered.map((item, idx) =>
        supabase.from('itinerary_items').update({ sort_order: idx }).eq('id', item.id)
      )
    )
  }

  return (
    <div>
      <AddItineraryForm onSubmit={handleAdd} />
      {items.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">No itinerary items yet</p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => <SortableItem key={item.id} item={item} />)}
        </SortableContext>
      </DndContext>
    </div>
  )
}
