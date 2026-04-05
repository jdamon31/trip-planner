import type { Expense } from '../supabase/types'

export interface Transaction {
  from: string
  to: string
  amount: number
}

export function calculateBalances(expenses: Expense[]): Map<string, number> {
  const balances = new Map<string, number>()

  const add = (id: string, delta: number) => {
    balances.set(id, (balances.get(id) ?? 0) + delta)
  }

  for (const expense of expenses) {
    add(expense.paid_by, expense.amount)
    for (const split of expense.splits) {
      add(split.member_id, -split.amount)
    }
  }

  return balances
}

export function minimumTransactions(balances: Map<string, number>): Transaction[] {
  const creditors: { id: string; amount: number }[] = []
  const debtors: { id: string; amount: number }[] = []

  for (const [id, amount] of balances) {
    const rounded = Math.round(amount * 100) / 100
    if (rounded > 0) creditors.push({ id, amount: rounded })
    else if (rounded < 0) debtors.push({ id, amount: -rounded })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transactions: Transaction[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci]
    const debt = debtors[di]
    const amount = Math.min(credit.amount, debt.amount)
    const rounded = Math.round(amount * 100) / 100

    transactions.push({ from: debt.id, to: credit.id, amount: rounded })

    credit.amount = Math.round((credit.amount - amount) * 100) / 100
    debt.amount = Math.round((debt.amount - amount) * 100) / 100

    if (Math.round(credit.amount * 100) === 0) ci++
    if (Math.round(debt.amount * 100) === 0) di++
  }

  return transactions
}
