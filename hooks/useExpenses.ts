'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Expense, ExpenseSplit } from '@/lib/supabase/types'

const EXPENSE_LIMIT = 500

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])

  const load = useCallback(async () => {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setExpenses(data as Expense[])
  }, [tripId])

  useEffect(() => {
    load()

    let lastRefresh = Date.now()
    function handleVisibility() {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 30_000) {
        lastRefresh = Date.now()
        load()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`expenses-${tripId}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [tripId])

  async function addExpense(params: {
    paidBy: string
    description: string
    amount: number
    category: string
    expense_date: string
    notes: string | null
    splits: ExpenseSplit[]
  }) {
    const supabase = getSupabaseClient()
    const { count } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)
    if ((count ?? 0) >= EXPENSE_LIMIT) throw new Error(`Expense limit reached (${EXPENSE_LIMIT} per trip)`)
    await supabase.from('expenses').insert({
      trip_id: tripId,
      paid_by: params.paidBy,
      description: params.description,
      amount: params.amount,
      category: params.category,
      expense_date: params.expense_date,
      notes: params.notes,
      splits: params.splits,
    })
    await load()
  }

  async function updateExpense(id: string, params: {
    description: string
    amount: number
    category: string
    expense_date: string
    notes: string | null
    splits: ExpenseSplit[]
  }) {
    const supabase = getSupabaseClient()
    await supabase.from('expenses').update({
      description: params.description,
      amount: params.amount,
      category: params.category,
      expense_date: params.expense_date,
      notes: params.notes,
      splits: params.splits,
    }).eq('id', id)
    await load()
  }

  async function deleteExpense(id: string) {
    const supabase = getSupabaseClient()
    await supabase.from('expenses').delete().eq('id', id)
    await load()
  }

  return { expenses, addExpense, updateExpense, deleteExpense }
}
