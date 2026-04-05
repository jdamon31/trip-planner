'use client'
import { useState } from 'react'
import { PollCard } from './PollCard'
import { CreatePollForm } from './CreatePollForm'
import type { Poll, Vote } from '@/lib/supabase/types'

interface PollListProps {
  polls: Poll[]
  votes: Vote[]
  currentMemberId: string
  onVote: (pollId: string, optionId: string) => void
  onDelete: (pollId: string) => void
  onCreatePoll: (question: string, options: string[]) => Promise<void>
}

export function PollList({ polls, votes, currentMemberId, onVote, onDelete, onCreatePoll }: PollListProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 font-medium mb-4 active:bg-gray-50">
          + Create a poll
        </button>
      )}
      {showForm && (
        <CreatePollForm
          onSubmit={async (q, opts) => { await onCreatePoll(q, opts); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {polls.length === 0 && !showForm && (
        <p className="text-center text-gray-400 text-sm py-8">No polls yet</p>
      )}
      {polls.map(poll => (
        <PollCard key={poll.id} poll={poll} votes={votes} currentMemberId={currentMemberId} onVote={onVote} onDelete={onDelete} />
      ))}
    </div>
  )
}
