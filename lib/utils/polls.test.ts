import type { Vote } from '@/lib/supabase/types'

function computeVoteAction(
  votes: Vote[],
  pollId: string,
  memberId: string,
  optionId: string,
  allowMultiple: boolean
): { action: 'upsert_single' | 'insert_multi' | 'delete_multi'; voteToDelete?: Vote } {
  if (!allowMultiple) {
    return { action: 'upsert_single' }
  }
  const existing = votes.find(
    v => v.poll_id === pollId && v.member_id === memberId && v.option_id === optionId
  )
  if (existing) {
    return { action: 'delete_multi', voteToDelete: existing }
  }
  return { action: 'insert_multi' }
}

describe('multi-select vote logic', () => {
  const existingVote: Vote = { id: 'v1', poll_id: 'p1', member_id: 'm1', option_id: 'opt-a' }

  it('single-select always returns upsert_single', () => {
    const result = computeVoteAction([], 'p1', 'm1', 'opt-a', false)
    expect(result.action).toBe('upsert_single')
  })

  it('multi-select with no existing vote returns insert_multi', () => {
    const result = computeVoteAction([], 'p1', 'm1', 'opt-a', true)
    expect(result.action).toBe('insert_multi')
  })

  it('multi-select on already-voted option returns delete_multi with the vote', () => {
    const result = computeVoteAction([existingVote], 'p1', 'm1', 'opt-a', true)
    expect(result.action).toBe('delete_multi')
    expect(result.voteToDelete).toBe(existingVote)
  })

  it('multi-select on different option returns insert_multi', () => {
    const result = computeVoteAction([existingVote], 'p1', 'm1', 'opt-b', true)
    expect(result.action).toBe('insert_multi')
  })
})
