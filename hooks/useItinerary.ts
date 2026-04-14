'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { ItineraryItem } from '@/lib/supabase/types'

export function useItinerary(tripId: string) {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [itineraryDays, setItineraryDays] = useState(1)

  const load = useCallback(async () => {
    const supabase = getSupabaseClient()
    const [{ data: itemData }, { data: tripData }] = await Promise.all([
      supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true })
        .order('time', { ascending: true, nullsFirst: false }),
      supabase
        .from('trips')
        .select('itinerary_days')
        .eq('id', tripId)
        .single(),
    ])
    if (itemData) setItems(itemData as ItineraryItem[])
    if (tripData) setItineraryDays(tripData.itinerary_days ?? 1)
  }, [tripId])

  useEffect(() => {
    load()

    let lastRefresh = Date.now()
    function handleVisibility() {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 30_000) {
        lastRefresh = Date.now()
        load()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`itinerary-${tripId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'itinerary_items', filter: `trip_id=eq.${tripId}` }, load)
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, load)
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [tripId])

  async function addItem(
    data: { day_number: number; time: string | null; activity: string; description: string | null; location: string | null },
    memberName: string
  ) {
    const supabase = getSupabaseClient()
    const { count } = await supabase
      .from('itinerary_items')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)
    if ((count ?? 0) >= 200) throw new Error('Activity limit reached (200 per trip)')
    const dayItems = items.filter(i => i.day_number === data.day_number)
    await supabase.from('itinerary_items').insert({
      trip_id: tripId,
      ...data,
      added_by: memberName,
      sort_order: dayItems.length,
    })
    await load()
  }

  async function updateItem(id: string, updates: Partial<Pick<ItineraryItem, 'activity' | 'time' | 'description' | 'location'>>) {
    const supabase = getSupabaseClient()
    await supabase.from('itinerary_items').update(updates).eq('id', id)
    await load()
  }

  async function deleteItem(id: string) {
    const supabase = getSupabaseClient()
    await supabase.from('itinerary_items').delete().eq('id', id)
    await load()
  }

  async function addDay() {
    const supabase = getSupabaseClient()
    await supabase.from('trips').update({ itinerary_days: itineraryDays + 1 }).eq('id', tripId)
    await load()
  }

  async function moveItem(id: string, newDayNumber: number) {
    const supabase = getSupabaseClient()
    await supabase.from('itinerary_items').update({ day_number: newDayNumber }).eq('id', id)
    await load()
  }

  return { items, itineraryDays, addItem, updateItem, deleteItem, addDay, moveItem }
}
