import type { Expense, Member } from '@/lib/supabase/types'
import { format } from 'date-fns'

interface ExpenseListProps {
  expenses: Expense[]
  members: Member[]
}

export function ExpenseList({ expenses, members }: ExpenseListProps) {
  const memberMap = new Map(members.map(m => [m.id, m.display_name]))
  if (expenses.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-gray-700">All Expenses</h3>
      {expenses.map(expense => (
        <div key={expense.id} className="bg-white border rounded-xl p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-800 text-sm">{expense.description}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Paid by {memberMap.get(expense.paid_by) ?? 'Unknown'} · {format(new Date(expense.created_at), 'MMM d')}
              </p>
            </div>
            <span className="font-bold text-gray-900 text-sm">${Number(expense.amount).toFixed(2)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(expense.splits as { member_id: string; amount: number }[]).map(split => (
              <span key={split.member_id} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">
                {memberMap.get(split.member_id) ?? 'Unknown'}: ${Number(split.amount).toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
