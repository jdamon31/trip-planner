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

  const myBalance = Math.round((balances.get(currentMemberId) ?? 0) * 100) / 100
  const myTransactions = transactions.filter(t => t.from === currentMemberId || t.to === currentMemberId)

  if (expenses.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-5 mb-4 text-center">
        <p className="text-3xl mb-2">💸</p>
        <p className="font-semibold text-gray-700">No expenses yet</p>
        <p className="text-sm text-gray-400 mt-1">Add the first one below</p>
      </div>
    )
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Personal hero */}
      <div className={`rounded-2xl p-5 ${myBalance > 0.01 ? 'bg-green-500' : myBalance < -0.01 ? 'bg-red-500' : 'bg-blue-600'}`}>
        {myBalance > 0.01 ? (
          <>
            <p className="text-green-100 text-sm font-medium">You are owed</p>
            <p className="text-white text-4xl font-bold mt-1">${myBalance.toFixed(2)}</p>
          </>
        ) : myBalance < -0.01 ? (
          <>
            <p className="text-red-100 text-sm font-medium">You owe</p>
            <p className="text-white text-4xl font-bold mt-1">${Math.abs(myBalance).toFixed(2)}</p>
          </>
        ) : (
          <>
            <p className="text-blue-100 text-sm font-medium">Your balance</p>
            <p className="text-white text-4xl font-bold mt-1">All settled ✅</p>
          </>
        )}
      </div>

      {/* To settle up */}
      {transactions.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">To settle up</h3>
          <ul className="space-y-2.5">
            {transactions.map((t, i) => {
              const isMe = t.from === currentMemberId || t.to === currentMemberId
              const fromName = t.from === currentMemberId ? 'You' : memberMap.get(t.from) ?? 'Unknown'
              const toName = t.to === currentMemberId ? 'you' : memberMap.get(t.to) ?? 'Unknown'
              return (
                <li key={i} className={`flex items-center justify-between ${isMe ? '' : 'opacity-60'}`}>
                  <span className={`text-sm ${isMe ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                    <span className={t.from === currentMemberId ? 'text-red-600' : ''}>{fromName}</span>
                    <span className="text-gray-400 mx-1.5">→</span>
                    <span className={t.to === currentMemberId ? 'text-green-600' : ''}>{toName}</span>
                  </span>
                  <span className={`font-bold text-sm ${isMe ? 'text-gray-900' : 'text-gray-500'}`}>
                    ${t.amount.toFixed(2)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
