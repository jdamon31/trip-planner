'use client'
import { useState } from 'react'
import type { Expense, Member } from '@/lib/supabase/types'
import { format, parseISO } from 'date-fns'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { AddExpenseSheet } from './AddExpenseSheet'

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍕',
  lodging: '🏨',
  transport: '🚗',
  activities: '🎯',
  misc: '📦',
}

interface ExpenseListProps {
  expenses: Expense[]
  members: Member[]
  currentMemberId: string
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, params: {
    description: string
    amount: number
    category: string
    expense_date: string
    notes: string | null
    splits: import('@/lib/supabase/types').ExpenseSplit[]
  }) => Promise<void>
}

export function ExpenseList({ expenses, members, currentMemberId, onDelete, onUpdate }: ExpenseListProps) {
  const memberMap = new Map(members.map(m => [m.id, m.display_name]))
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  if (expenses.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">All Expenses</h3>
      {expenses.map(expense => {
        const isMine = expense.paid_by === currentMemberId
        return (
          <div key={expense.id} className="bg-white border rounded-xl p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{CATEGORY_EMOJI[expense.category] ?? '📦'}</span>
                  <p className="font-semibold text-gray-900 text-sm truncate">{expense.description}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {memberMap.get(expense.paid_by) ?? 'Unknown'} paid
                  {' · '}
                  {expense.expense_date
                    ? format(parseISO(expense.expense_date), 'MMM d')
                    : format(parseISO(expense.created_at), 'MMM d')}
                </p>
                {expense.notes && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">{expense.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-gray-900">${Number(expense.amount).toFixed(2)}</span>
                {isMine && (
                  <button
                    onClick={() => setEditingExpense(expense)}
                    className="text-gray-400 p-1 active:text-gray-600 text-sm"
                    aria-label="Edit expense"
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={() => setDeletingExpense(expense)}
                  className="text-gray-300 p-1 active:text-gray-500"
                  aria-label="Delete expense"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {expense.splits.map(split => (
                <span key={split.member_id} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">
                  {memberMap.get(split.member_id) ?? 'Unknown'}: ${Number(split.amount).toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        )
      })}

      {/* Edit sheet */}
      <BottomSheet
        open={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
        title="Edit Expense"
      >
        {editingExpense && (
          <AddExpenseSheet
            members={members}
            currentMemberId={currentMemberId}
            initial={editingExpense}
            onSubmit={async () => {}}
            onUpdate={async (params) => { await onUpdate(editingExpense.id, params) }}
            onClose={() => setEditingExpense(null)}
          />
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <BottomSheet open={deletingExpense !== null} onClose={() => setDeletingExpense(null)} title="Delete expense?">
        <div className="space-y-4 pb-2">
          <p className="text-sm text-gray-600">
            Permanently delete <strong>&ldquo;{deletingExpense?.description}&rdquo;</strong> (${Number(deletingExpense?.amount ?? 0).toFixed(2)})?
            This will affect everyone&apos;s balances.
          </p>
          <button
            onClick={async () => { await onDelete(deletingExpense!.id); setDeletingExpense(null) }}
            className="w-full bg-red-600 text-white rounded-lg py-3 font-semibold text-sm active:bg-red-700"
          >
            Delete expense
          </button>
          <button
            onClick={() => setDeletingExpense(null)}
            className="w-full border rounded-lg py-3 text-sm text-gray-700"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
