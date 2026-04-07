'use client'
import type { Poll, Vote, PollOption } from '@/lib/supabase/types'

type PollCardProps = {
  poll: Poll
  votes: Vote[]
  currentMemberId: string
  memberCount: number
  onVote: (pollId: string, optionId: string) => void
  onDelete: (pollId: string) => void
}

export function PollCard({ poll, votes, currentMemberId, memberCount, onVote, onDelete }: PollCardProps) {
  const pollVotes = votes.filter(v => v.poll_id === poll.id)
  const myVotes = pollVotes.filter(v => v.member_id === currentMemberId)
  const hasVoted = myVotes.length > 0

  const voteCounts = new Map<string, number>()
  for (const v of pollVotes) {
    voteCounts.set(v.option_id, (voteCounts.get(v.option_id) ?? 0) + 1)
  }

  const uniqueVoters = new Set(pollVotes.map(v => v.member_id)).size

  return (
    <div className="bg-white border rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-gray-800 flex-1">{poll.question}</h3>
        {poll.created_by === currentMemberId && (
          <button onClick={() => onDelete(poll.id)} className="text-gray-400 text-sm ml-2 shrink-0" aria-label="Delete poll">✕</button>
        )}
      </div>
      {poll.allow_multiple && (
        <p className="text-xs text-blue-500 mb-3">Multiple choice</p>
      )}
      <div className="space-y-2">
        {(poll.options as PollOption[]).map(option => {
          const count = voteCounts.get(option.id) ?? 0
          const denominator = poll.allow_multiple ? memberCount : uniqueVoters
          const pct = denominator > 0 ? Math.round((count / denominator) * 100) : 0
          const isMyVote = myVotes.some(v => v.option_id === option.id)
          return (
            <button
              key={option.id}
              onClick={() => onVote(poll.id, option.id)}
              className={`w-full text-left rounded-lg border-2 overflow-hidden transition-colors ${isMyVote ? 'border-blue-500' : 'border-gray-200'}`}
            >
              <div className="relative px-3 py-2.5">
                {hasVoted && (
                  <div className={`absolute inset-0 ${isMyVote ? 'bg-blue-50' : 'bg-gray-50'}`} style={{ width: `${pct}%` }} />
                )}
                <div className="relative flex items-center justify-between">
                  <span className={`text-sm font-medium ${isMyVote ? 'text-blue-700' : 'text-gray-700'}`}>
                    {option.label}
                    {poll.allow_multiple
                      ? <span className={`ml-1.5 ${isMyVote ? '' : 'opacity-0'}`}>☑</span>
                      : isMyVote && <span className="ml-1.5">✓</span>
                    }
                  </span>
                  {hasVoted && <span className="text-xs text-gray-500">{pct}%</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {uniqueVoters > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          {poll.allow_multiple
            ? `${uniqueVoters} member${uniqueVoters !== 1 ? 's' : ''} voted`
            : `${uniqueVoters} vote${uniqueVoters !== 1 ? 's' : ''}`
          }
        </p>
      )}
    </div>
  )
}
