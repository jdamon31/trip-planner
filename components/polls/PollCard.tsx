'use client'
import type { Poll, Vote, PollOption } from '@/lib/supabase/types'

interface PollCardProps {
  poll: Poll
  votes: Vote[]
  currentMemberId: string
  onVote: (pollId: string, optionId: string) => void
  onDelete: (pollId: string) => void
}

export function PollCard({ poll, votes, currentMemberId, onVote, onDelete }: PollCardProps) {
  const pollVotes = votes.filter(v => v.poll_id === poll.id)
  const myVote = pollVotes.find(v => v.member_id === currentMemberId)
  const total = pollVotes.length

  const voteCounts = new Map<string, number>()
  for (const v of pollVotes) {
    voteCounts.set(v.option_id, (voteCounts.get(v.option_id) ?? 0) + 1)
  }

  return (
    <div className="bg-white border rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex-1">{poll.question}</h3>
        {poll.created_by === currentMemberId && (
          <button onClick={() => onDelete(poll.id)} className="text-gray-400 text-sm ml-2 shrink-0" aria-label="Delete poll">✕</button>
        )}
      </div>
      <div className="space-y-2">
        {(poll.options as PollOption[]).map(option => {
          const count = voteCounts.get(option.id) ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const isMyVote = myVote?.option_id === option.id
          return (
            <button
              key={option.id}
              onClick={() => onVote(poll.id, option.id)}
              className={`w-full text-left rounded-lg border-2 overflow-hidden transition-colors ${isMyVote ? 'border-blue-500' : 'border-gray-200'}`}
            >
              <div className="relative px-3 py-2.5">
                {myVote && (
                  <div className={`absolute inset-0 ${isMyVote ? 'bg-blue-50' : 'bg-gray-50'}`} style={{ width: `${pct}%` }} />
                )}
                <div className="relative flex items-center justify-between">
                  <span className={`text-sm font-medium ${isMyVote ? 'text-blue-700' : 'text-gray-700'}`}>
                    {option.label}{isMyVote && <span className="ml-1.5">✓</span>}
                  </span>
                  {myVote && <span className="text-xs text-gray-500">{pct}%</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {total > 0 && <p className="text-xs text-gray-400 mt-2">{total} vote{total !== 1 ? 's' : ''}</p>}
    </div>
  )
}
