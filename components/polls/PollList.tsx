'use client'
import { useState } from 'react'
import type { Poll, Vote } from '@/lib/supabase/types'
import { PollCard } from './PollCard'
import { CreatePollForm } from './CreatePollForm'
import { BottomSheet } from '@/components/ui/BottomSheet'

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
  const [deletingPoll, setDeletingPoll] = useState<Poll | null>(null)

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
          onRequestDelete={setDeletingPoll}
        />
      ))}
      {polls.length === 0 && !showCreate && (
        <p className="text-sm text-gray-400 text-center py-8">No polls yet — create one above</p>
      )}

      <BottomSheet
        open={deletingPoll !== null}
        onClose={() => setDeletingPoll(null)}
        title="Delete poll?"
      >
        <div className="space-y-4 pb-2">
          <p className="text-sm text-gray-600">
            This will permanently delete &ldquo;<strong>{deletingPoll?.question}</strong>&rdquo; and all votes.
          </p>
          <button
            onClick={() => { onDelete(deletingPoll!.id); setDeletingPoll(null) }}
            className="w-full bg-red-600 text-white rounded-lg py-3 font-semibold text-sm active:bg-red-700"
          >
            Delete poll
          </button>
          <button
            onClick={() => setDeletingPoll(null)}
            className="w-full border rounded-lg py-3 text-sm text-gray-700"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
