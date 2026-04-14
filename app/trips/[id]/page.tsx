'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTrip } from '@/hooks/useTrip'
import { getMemberFromStorage, saveMemberToStorage } from '@/hooks/useMember'
import { useAuth } from '@/contexts/AuthContext'
import { getSupabaseClient } from '@/lib/supabase/client'
import { TabBar, type Tab } from '@/components/ui/TabBar'
import { TripHeader } from '@/components/trip/TripHeader'
import { TripNotes } from '@/components/trip/TripNotes'
import { TripLinks } from '@/components/trip/TripLinks'
import { ItineraryList } from '@/components/itinerary/ItineraryList'
import { RangeVotingView } from '@/components/availability/RangeVotingView'
import { useRangeVotes } from '@/hooks/useRangeVotes'
import { usePolls } from '@/hooks/usePolls'
import { PollList } from '@/components/polls/PollList'
import { useExpenses } from '@/hooks/useExpenses'
import { useMessages } from '@/hooks/useMessages'
import { ChatView } from '@/components/chat/ChatView'
import { BalancesSummary } from '@/components/expenses/BalancesSummary'
import { ExpenseList } from '@/components/expenses/ExpenseList'
import { AddExpenseSheet } from '@/components/expenses/AddExpenseSheet'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Skeleton } from '@/components/ui/Skeleton'
import type { RangeVoteStatus } from '@/lib/supabase/types'

export default function TripPage() {
  const params = useParams<{ id: string }>()
  const tripId = params.id
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { trip, members, loading } = useTrip(tripId)
  const { votes: rangeVotes, castVote, deleteRangeVotes } = useRangeVotes(tripId)
  const { polls, votes, createPoll, vote, deletePoll, refetchPolls } = usePolls(tripId)
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(tripId)
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [member, setMember] = useState<{ memberId: string; displayName: string } | null>(null)
  const { messages, sendMessage, loadOlder, unreadCount, markRead } = useMessages(tripId, member?.memberId ?? '')

  const markReadRef = useRef(markRead)
  markReadRef.current = markRead

  useEffect(() => {
    if (activeTab === 'chat') markReadRef.current()
  }, [activeTab])

  function handleTabChange(tab: Tab) {
    if (tab === 'polls') refetchPolls()
    setActiveTab(tab)
  }

  useEffect(() => {
    if (loading || authLoading) return
    const stored = getMemberFromStorage(tripId)
    if (stored) { setMember(stored); return }
    if (user) {
      const existing = members.find(m => m.user_id === user.id)
      if (existing) {
        saveMemberToStorage(tripId, { memberId: existing.id, displayName: existing.display_name })
        setMember({ memberId: existing.id, displayName: existing.display_name })
        return
      }
    }
    router.replace(`/trips/${tripId}/join`)
  }, [tripId, router, user, loading, authLoading, members])

  async function handleLeave() {
    if (!member) return
    await fetch(`/api/trips/${tripId}/members/${member.memberId}`, { method: 'DELETE' })
    localStorage.removeItem(`trip_member_${tripId}`)
    router.replace('/')
  }

  async function handleDelete() {
    await fetch(`/api/trips/${tripId}`, { method: 'DELETE' })
    router.replace('/')
  }

  // Range management (date_ranges live in trip, updated via real-time)
  const ranges = trip?.date_ranges ?? []

  async function addRange(start: string, end: string) {
    await fetch(`/api/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_ranges: [...ranges, { start, end }] }),
    })
  }

  async function removeRange(start: string, end: string) {
    await fetch(`/api/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_ranges: ranges.filter(r => !(r.start === start && r.end === end)) }),
    })
    await deleteRangeVotes(start, end)
  }

  async function handleVote(rangeStart: string, rangeEnd: string, status: RangeVoteStatus, caveat: string | null) {
    if (!member) return
    await castVote(rangeStart, rangeEnd, member.memberId, status, caveat)
  }

  async function confirmDates(dates: string[]) {
    const supabase = getSupabaseClient()
    await supabase.from('trips').update({ confirmed_dates: [...dates].sort() }).eq('id', tripId)
  }

  async function unconfirmDates(_dates: string[]) {
    const supabase = getSupabaseClient()
    await supabase.from('trips').update({ confirmed_dates: [] }).eq('id', tripId)
  }

  const isCreator = !!(trip?.created_by_user_id && user?.id === trip.created_by_user_id)

  if (loading || authLoading || !trip || !member) {
    return (
      <div className="min-h-screen p-4">
        <div className="bg-white rounded-xl border p-4 mb-4 flex items-start gap-3">
          <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 mb-4 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <Skeleton className="h-4 w-1/4" />
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{trip.name}</h1>
            {trip.destination && <p className="text-sm text-gray-500">{trip.destination}</p>}
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/trips/${tripId}/join`
              if (navigator.share) {
                navigator.share({ title: trip.name, url })
              } else {
                navigator.clipboard.writeText(url)
                alert('Invite link copied!')
              }
            }}
            className="text-blue-600 text-sm font-medium border border-blue-200 rounded-full px-3 py-1.5 active:bg-blue-50 shrink-0 ml-3"
          >
            Share
          </button>
        </div>
      </header>

      <main className={activeTab === 'chat' ? 'px-4 pt-2 pb-0' : 'p-4'}>
        {activeTab === 'details' && (
          <>
            <TripHeader trip={trip} isCreator={isCreator} onLeave={handleLeave} onDelete={handleDelete} />
            <TripNotes tripId={tripId} initialNotes={trip.description} />
            <TripLinks tripId={tripId} memberId={member.memberId} />
            <div className="mt-4 bg-white rounded-xl border p-4 mb-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">People ({members.length})</h3>
              <ol className="space-y-2 list-none">
                {members.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                    <span>{m.display_name}</span>
                    {m.id === member.memberId && <span className="text-xs text-blue-500">(you)</span>}
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
        {activeTab === 'availability' && (
          <RangeVotingView
            ranges={ranges}
            votes={rangeVotes}
            members={members}
            currentMemberId={member.memberId}
            isCreator={isCreator}
            confirmedDates={trip.confirmed_dates ?? []}
            onAddRange={addRange}
            onRemoveRange={removeRange}
            onVote={handleVote}
            onConfirmDates={confirmDates}
            onUnconfirmDates={unconfirmDates}
          />
        )}
        {activeTab === 'itinerary' && (
          <ItineraryList
            tripId={tripId}
            confirmedDates={trip.confirmed_dates ?? []}
            memberName={member.displayName}
          />
        )}
        {activeTab === 'polls' && (
          <PollList
            polls={polls}
            votes={votes}
            currentMemberId={member.memberId}
            memberCount={members.length}
            onVote={(pollId, optionId) => vote(pollId, member.memberId, optionId)}
            onDelete={deletePoll}
            onCreatePoll={(q, opts, allowMultiple) => createPoll(q, opts, member.memberId, allowMultiple)}
          />
        )}
        {activeTab === 'expenses' && (
          <>
            <BalancesSummary expenses={expenses} members={members} currentMemberId={member.memberId} />
            <button
              onClick={() => setShowAddExpense(true)}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm mb-4 active:bg-blue-700"
            >
              + Add Expense
            </button>
            <ExpenseList expenses={expenses} members={members} currentMemberId={member.memberId} onDelete={deleteExpense} onUpdate={(id, params) => updateExpense(id, params)} />
            <BottomSheet open={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add Expense">
              <AddExpenseSheet
                members={members}
                currentMemberId={member.memberId}
                onSubmit={addExpense}
                onClose={() => setShowAddExpense(false)}
              />
            </BottomSheet>
          </>
        )}
        {activeTab === 'chat' && (
          <ChatView
            messages={messages}
            currentMemberId={member.memberId}
            currentDisplayName={member.displayName}
            onSend={(content) => sendMessage(member.memberId, member.displayName, content)}
            onLoadOlder={loadOlder}
          />
        )}
      </main>

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} badges={{ chat: unreadCount }} />
    </div>
  )
}
