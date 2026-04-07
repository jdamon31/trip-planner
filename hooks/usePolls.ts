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
      // TODO: votes subscription is unfiltered — load() is trip-scoped so data is correct,
      // but this fires on votes from all trips. Acceptable for v1.
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'votes' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function createPoll(question: string, options: string[], createdBy: string, allowMultiple = false) {
    const supabase = getSupabaseClient()
    await supabase.from('polls').insert({
      trip_id: tripId,
      created_by: createdBy,
      question,
      options: options.map((label, i) => ({ id: String(i), label })),
      allow_multiple: allowMultiple,
    })
  }

  async function vote(pollId: string, memberId: string, optionId: string) {
    const supabase = getSupabaseClient()
    const poll = polls.find(p => p.id === pollId)
    if (poll?.allow_multiple) {
      // Multi-select: toggle — delete if already voted for this option, insert otherwise
      const existing = votes.find(
        v => v.poll_id === pollId && v.member_id === memberId && v.option_id === optionId
      )
      if (existing) {
        await supabase.from('votes').delete().eq('id', existing.id)
      } else {
        await supabase.from('votes').insert({ poll_id: pollId, member_id: memberId, option_id: optionId })
      }
    } else {
      // single-select: delete all existing votes for this member+poll, then insert new
      await supabase
        .from('votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('member_id', memberId)

      await supabase.from('votes').insert({
        poll_id: pollId,
        member_id: memberId,
        option_id: optionId,
      })
    }
  }

  async function deletePoll(pollId: string) {
    const supabase = getSupabaseClient()
    await supabase.from('polls').delete().eq('id', pollId)
  }

  return { polls, votes, createPoll, vote, deletePoll }
}
