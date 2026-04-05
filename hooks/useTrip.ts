'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Trip, Member } from '@/lib/supabase/types'

export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function load() {
      const [{ data: tripData }, { data: membersData }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('members').select('*').eq('trip_id', tripId),
      ])
      if (tripData) setTrip(tripData as Trip)
      if (membersData) setMembers(membersData as Member[])
      setLoading(false)
    }

    load()

    const channel: RealtimeChannel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` } as any,
        (payload) => setTrip(payload.new as Trip)
      )
      .on(
        'postgres_changes',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { event: 'INSERT', schema: 'public', table: 'members', filter: `trip_id=eq.${tripId}` } as any,
        (payload) => setMembers(prev => [...prev, payload.new as Member])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  return { trip, members, loading }
}
