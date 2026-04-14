'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { RangeVote, RangeVoteStatus } from '@/lib/supabase/types'

export function useRangeVotes(tripId: string) {
  const [votes, setVotes] = useState<RangeVote[]>([])

  const load = useCallback(async () => {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('range_votes')
      .select('*')
      .eq('trip_id', tripId)
    if (data) setVotes(data as RangeVote[])
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
      .channel(`range-votes-${tripId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'range_votes', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [tripId, load])

  async function castVote(rangeStart: string, rangeEnd: string, memberId: string, status: RangeVoteStatus, caveat: string | null = null) {
    const supabase = getSupabaseClient()
    await supabase.from('range_votes').upsert(
      {
        trip_id: tripId,
        range_start: rangeStart,
        range_end: rangeEnd,
        member_id: memberId,
        status,
        caveat: caveat?.trim() || null,
      },
      { onConflict: 'trip_id,range_start,range_end,member_id' }
    )
    await load()
  }

  async function deleteRangeVotes(rangeStart: string, rangeEnd: string) {
    const supabase = getSupabaseClient()
    await supabase.from('range_votes')
      .delete()
      .eq('trip_id', tripId)
      .eq('range_start', rangeStart)
      .eq('range_end', rangeEnd)
    await load()
  }

  return { votes, castVote, deleteRangeVotes }
}
