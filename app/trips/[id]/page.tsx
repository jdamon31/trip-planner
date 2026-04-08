'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTrip } from '@/hooks/useTrip'
import { getMemberFromStorage, saveMemberToStorage } from '@/hooks/useMember'
import { useAuth } from '@/contexts/AuthContext'
import { TabBar, type Tab } from '@/components/ui/TabBar'
import { TripHeader } from '@/components/trip/TripHeader'
import { TripNotes } from '@/components/trip/TripNotes'
import { TripLinks } from '@/components/trip/TripLinks'
import { ItineraryList } from '@/components/itinerary/ItineraryList'
import { useAvailability } from '@/hooks/useAvailability'
import { AvailabilityGrid } from '@/components/availability/AvailabilityGrid'
import { usePolls } from '@/hooks/usePolls'
import { PollList } from '@/components/polls/PollList'
import { useExpenses } from '@/hooks/useExpenses'
import { BalancesSummary } from '@/components/expenses/BalancesSummary'
import { ExpenseList } from '@/components/expenses/ExpenseList'
import { AddExpenseSheet } from '@/components/expenses/AddExpenseSheet'
import { BottomSheet } from '@/components/ui/BottomSheet'

export default function TripPage() {
  const params = useParams<{ id: string }>()
  const tripId = params.id
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { trip, members, loading } = useTrip(tripId)
  const { rows: availRows, dates, expandDateRange, removeDate } = useAvailability(tripId)
  const { polls, votes, createPoll, vote, deletePoll, refetchPolls } = usePolls(tripId)
  const { expenses, addExpense } = useExpenses(tripId)
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [showAddExpense, setShowAddExpense] = useState(false)

  function handleTabChange(tab: Tab) {
    if (tab === 'polls') refetchPolls()
    setActiveTab(tab)
  }
  const [member, setMember] = useState<{ memberId: string; displayName: string } | null>(null)

  useEffect(() => {
    if (loading || authLoading) return

    // Check localStorage first
    const stored = getMemberFromStorage(tripId)
    if (stored) {
      setMember(stored)
      return
    }

    // If signed in, check if already a member via user_id
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

  const isCreator = !!(trip?.created_by_user_id && user?.id === trip.created_by_user_id)

  if (loading || authLoading || !trip || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
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

      <main className="p-4">
        {activeTab === 'details' && (
          <>
            <TripHeader
              trip={trip}
              isCreator={isCreator}
              onLeave={handleLeave}
              onDelete={handleDelete}
            />
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
            <div className="mt-2">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Itinerary</h3>
              <ItineraryList tripId={tripId} />
            </div>
          </>
        )}
        {activeTab === 'availability' && (
          <AvailabilityGrid
            tripId={tripId}
            members={members}
            rows={availRows}
            dates={dates}
            currentMemberId={member.memberId}
            onExpandRange={expandDateRange}
            onRemoveDate={removeDate}
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
            <ExpenseList expenses={expenses} members={members} />
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
      </main>

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}
