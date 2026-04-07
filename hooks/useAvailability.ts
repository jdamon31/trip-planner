'use client'
import { useState, useEffect, useMemo } from 'react'
import { eachDayOfInterval, parseISO, addDays, format } from 'date-fns'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Availability, DateRangeEntry } from '@/lib/supabase/types'

export function useAvailability(tripId: string) {
  const [rows, setRows] = useState<Availability[]>([])
  const [proposedRanges, setProposedRanges] = useState<DateRangeEntry[]>([])

  // Computed: sorted unique dates from all proposed ranges
  const dates = useMemo(() => {
    const dateSet = new Set<string>()
    for (const range of proposedRanges) {
      try {
        const interval = eachDayOfInterval({
          start: parseISO(range.start),
          end: parseISO(range.end),
        })
        for (const d of interval) {
          dateSet.add(format(d, 'yyyy-MM-dd'))
        }
      } catch {
        // skip invalid ranges
      }
    }
    return Array.from(dateSet)
      .sort()
      .map(d => parseISO(d))
  }, [proposedRanges])

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function load() {
      // Load trip's date_ranges
      const { data: tripData } = await supabase
        .from('trips')
        .select('date_ranges')
        .eq('id', tripId)
        .single()

      // Load availability rows for all members
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('trip_id', tripId)

      if (!memberData || memberData.length === 0) {
        setRows([])
        // Still set ranges from trip
        const storedRanges = (tripData?.date_ranges as DateRangeEntry[] | null) ?? []
        setProposedRanges(storedRanges)
        return
      }

      const memberIds = memberData.map(m => m.id)
      const { data: availData } = await supabase
        .from('availability')
        .select('*')
        .in('member_id', memberIds)

      if (availData) setRows(availData as Availability[])

      const storedRanges = (tripData?.date_ranges as DateRangeEntry[] | null) ?? []

      if (storedRanges.length > 0) {
        setProposedRanges(storedRanges)
      } else if (availData && availData.length > 0) {
        // Legacy fallback: derive a single range from existing availability rows
        const sortedDates = availData.map(r => r.date).sort()
        setProposedRanges([{ start: sortedDates[0], end: sortedDates[sortedDates.length - 1] }])
      }
    }

    load()

    const channel = supabase
      .channel(`availability-${tripId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'availability' },
        (payload: any) => {
          const changedMemberId = payload.new?.member_id ?? payload.old?.member_id
          if (!changedMemberId) { load(); return }
          getSupabaseClient()
            .from('members').select('id').eq('trip_id', tripId).eq('id', changedMemberId).single()
            .then(({ data }) => { if (data) load() })
        }
      )
      // Also listen for trip updates (date_ranges changes from other members)
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        () => { load() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function expandDateRange(start: string, end: string) {
    const newRanges = [...proposedRanges, { start, end }]
    setProposedRanges(newRanges)
    await fetch(`/api/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_ranges: newRanges }),
    })
  }

  async function removeDate(dateStr: string, memberIds: string[]) {
    // 1. Delete availability rows for this date
    const supabase = getSupabaseClient()
    if (memberIds.length > 0) {
      await supabase
        .from('availability')
        .delete()
        .eq('date', dateStr)
        .in('member_id', memberIds)
    }

    // 2. Remove the date from proposedRanges, splitting if needed
    const newRanges: DateRangeEntry[] = []
    for (const range of proposedRanges) {
      if (dateStr < range.start || dateStr > range.end) {
        newRanges.push(range)
      } else if (dateStr === range.start && dateStr === range.end) {
        // Single-day range — just drop it
      } else if (dateStr === range.start) {
        const nextDay = format(addDays(parseISO(dateStr), 1), 'yyyy-MM-dd')
        newRanges.push({ start: nextDay, end: range.end })
      } else if (dateStr === range.end) {
        const prevDay = format(addDays(parseISO(dateStr), -1), 'yyyy-MM-dd')
        newRanges.push({ start: range.start, end: prevDay })
      } else {
        // Split range around the removed date
        const prevDay = format(addDays(parseISO(dateStr), -1), 'yyyy-MM-dd')
        const nextDay = format(addDays(parseISO(dateStr), 1), 'yyyy-MM-dd')
        newRanges.push({ start: range.start, end: prevDay })
        newRanges.push({ start: nextDay, end: range.end })
      }
    }

    setProposedRanges(newRanges)
    await fetch(`/api/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_ranges: newRanges }),
    })
  }

  return { rows, dates, expandDateRange, removeDate }
}
