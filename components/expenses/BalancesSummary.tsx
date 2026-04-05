import { calculateBalances, minimumTransactions } from '@/lib/utils/expenses'
import type { Expense, Member } from '@/lib/supabase/types'

interface BalancesSummaryProps {
  expenses: Expense[]
  members: Member[]
  currentMemberId: string
}

export function BalancesSummary({ expenses, members, currentMemberId }: BalancesSummaryProps) {
  const memberMap = new Map(members.map(m => [m.id, m.display_name]))
  const balances = calculateBalances(expenses)
  const transactions = minimumTransactions(balances)

  if (expenses.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-1">Balances</h3>
        <p className="text-sm text-gray-400">No expenses yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-4 mb-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">Balances</h3>
      {transactions.length === 0 ? (
        <p className="text-sm text-green-600 font-medium">✅ All settled up!</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((t, i) => {
            const fromName = memberMap.get(t.from) ?? 'Unknown'
            const toName = memberMap.get(t.to) ?? 'Unknown'
            return (
              <li key={i} className={`text-sm ${t.from === currentMemberId || t.to === currentMemberId ? 'font-semibold' : 'text-gray-600'}`}>
                <span className={t.from === currentMemberId ? 'text-red-600' : ''}>{fromName}</span>
                {' owes '}
                <span className={t.to === currentMemberId ? 'text-green-600' : ''}>{toName}</span>
                {' '}
                <span className="font-bold">${t.amount.toFixed(2)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
