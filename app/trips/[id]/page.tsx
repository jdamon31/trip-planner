'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTrip } from '@/hooks/useTrip'
import { getMemberFromStorage } from '@/hooks/useMember'
import { TabBar, type Tab } from '@/components/ui/TabBar'
import { TripHeader } from '@/components/trip/TripHeader'
import { TripNotes } from '@/components/trip/TripNotes'
import { TripLinks } from '@/components/trip/TripLinks'

export default function TripPage() {
  const params = useParams<{ id: string }>()
  const tripId = params.id
  const router = useRouter()
  const { trip, members, loading } = useTrip(tripId)
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [member, setMember] = useState<{ memberId: string; displayName: string } | null>(null)

  useEffect(() => {
    const stored = getMemberFromStorage(tripId)
    if (!stored) {
      router.replace(`/trips/${tripId}/join`)
    } else {
      setMember(stored)
    }
  }, [tripId, router])

  if (loading || !trip || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="font-bold text-lg">{trip.name}</h1>
        {trip.destination && <p className="text-sm text-gray-500">{trip.destination}</p>}
      </header>

      <main className="p-4">
        {activeTab === 'details' && (
          <>
            <TripHeader trip={trip} />
            <TripNotes tripId={tripId} initialNotes={trip.description} />
            <TripLinks tripId={tripId} memberId={member.memberId} />
          </>
        )}
        {activeTab === 'availability' && (
          <p className="text-gray-500 text-sm">Availability tab — coming soon</p>
        )}
        {activeTab === 'polls' && (
          <p className="text-gray-500 text-sm">Polls tab — coming soon</p>
        )}
        {activeTab === 'expenses' && (
          <p className="text-gray-500 text-sm">Expenses tab — coming soon</p>
        )}
      </main>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
