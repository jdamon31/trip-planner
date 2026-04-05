'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Availability, AvailabilityStatus } from '@/lib/supabase/types'

export function useAvailability(tripId: string) {
  const [rows, setRows] = useState<Availability[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function load() {
      // Load availability for all members of this trip
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('trip_id', tripId)

      if (!memberData || memberData.length === 0) {
        setRows([])
        return
      }

      const memberIds = memberData.map(m => m.id)
      const { data } = await supabase
        .from('availability')
        .select('*')
        .in('member_id', memberIds)

      if (data) {
        setRows(data as Availability[])
        if (data.length > 0) {
          const dates = data.map(r => r.date).sort()
          setDateRange({ start: dates[0], end: dates[dates.length - 1] })
        }
      }
    }

    load()

    const channel = supabase
      .channel(`availability-${tripId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'availability' },
        () => { load() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function upsertAvailability(memberId: string, date: string, status: AvailabilityStatus) {
    const supabase = getSupabaseClient()
    await supabase.from('availability').upsert(
      { member_id: memberId, date, status },
      { onConflict: 'member_id,date' }
    )
  }

  function expandDateRange(start: string, end: string) {
    setDateRange(prev => {
      const newStart = prev ? (start < prev.start ? start : prev.start) : start
      const newEnd = prev ? (end > prev.end ? end : prev.end) : end
      return { start: newStart, end: newEnd }
    })
  }

  return { rows, dateRange, upsertAvailability, expandDateRange }
}
