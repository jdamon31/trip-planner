'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Expense, ExpenseSplit } from '@/lib/supabase/types'

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function load() {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
      if (data) setExpenses(data as Expense[])
    }

    load()

    const channel = supabase
      .channel(`expenses-${tripId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function addExpense(params: {
    paidBy: string
    description: string
    amount: number
    splits: ExpenseSplit[]
  }) {
    const supabase = getSupabaseClient()
    await supabase.from('expenses').insert({
      trip_id: tripId,
      paid_by: params.paidBy,
      description: params.description,
      amount: params.amount,
      splits: params.splits,
    })
  }

  return { expenses, addExpense }
}
