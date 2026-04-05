'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Poll, Vote } from '@/lib/supabase/types'

export function usePolls(tripId: string) {
  const [polls, setPolls] = useState<Poll[]>([])
  const [votes, setVotes] = useState<Vote[]>([])

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function load() {
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('trip_id', tripId)

      const memberIds = memberData?.map(m => m.id) ?? []

      const [{ data: pollData }, { data: voteData }] = await Promise.all([
        supabase.from('polls').select('*').eq('trip_id', tripId).order('created_at'),
        memberIds.length > 0
          ? supabase.from('votes').select('*').in('member_id', memberIds)
          : Promise.resolve({ data: [] }),
      ])

      if (pollData) setPolls(pollData as Poll[])
      if (voteData) setVotes(voteData as Vote[])
    }

    load()

    const channel = supabase
      .channel(`polls-${tripId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'polls', filter: `trip_id=eq.${tripId}` }, load)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'votes' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function createPoll(question: string, options: string[], createdBy: string) {
    const supabase = getSupabaseClient()
    await supabase.from('polls').insert({
      trip_id: tripId,
      created_by: createdBy,
      question,
      options: options.map((label, i) => ({ id: String(i), label })),
    })
  }

  async function vote(pollId: string, memberId: string, optionId: string) {
    const supabase = getSupabaseClient()
    await supabase.from('votes').upsert(
      { poll_id: pollId, member_id: memberId, option_id: optionId },
      { onConflict: 'poll_id,member_id' }
    )
  }

  async function deletePoll(pollId: string) {
    const supabase = getSupabaseClient()
    await supabase.from('polls').delete().eq('id', pollId)
  }

  return { polls, votes, createPoll, vote, deletePoll }
}
