'use client'
import { useState } from 'react'
import type { Poll, Vote } from '@/lib/supabase/types'
import { PollCard } from './PollCard'
import { CreatePollForm } from './CreatePollForm'

type PollListProps = {
  polls: Poll[]
  votes: Vote[]
  currentMemberId: string
  memberCount: number
  onVote: (pollId: string, optionId: string) => void
  onDelete: (pollId: string) => void
  onCreatePoll: (question: string, options: string[], allowMultiple: boolean) => Promise<void>
}

export function PollList({ polls, votes, currentMemberId, memberCount, onVote, onDelete, onCreatePoll }: PollListProps) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div>
      {!showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 font-medium mb-4 active:bg-gray-50"
        >
          + New Poll
        </button>
      )}
      {showCreate && (
        <CreatePollForm
          onSubmit={async (q, opts, allowMultiple) => {
            await onCreatePoll(q, opts, allowMultiple)
            setShowCreate(false)
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}
      {polls.map(poll => (
        <PollCard
          key={poll.id}
          poll={poll}
          votes={votes}
          currentMemberId={currentMemberId}
          memberCount={memberCount}
          onVote={onVote}
          onDelete={onDelete}
        />
      ))}
      {polls.length === 0 && !showCreate && (
        <p className="text-sm text-gray-400 text-center py-8">No polls yet — create one above</p>
      )}
    </div>
  )
}
