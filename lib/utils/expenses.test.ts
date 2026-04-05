import { calculateBalances, minimumTransactions } from './expenses'
import type { Expense } from '../supabase/types'

const makeExpense = (paid_by: string, amount: number, splits: { member_id: string; amount: number }[]): Expense => ({
  id: 'e1',
  trip_id: 't1',
  paid_by,
  description: 'test',
  amount,
  splits,
  created_at: '2026-01-01',
})

describe('calculateBalances', () => {
  it('returns correct net when one person pays and splits evenly among two', () => {
    const expenses: Expense[] = [
      makeExpense('alice', 100, [
        { member_id: 'alice', amount: 50 },
        { member_id: 'bob', amount: 50 },
      ]),
    ]
    const balances = calculateBalances(expenses)
    expect(balances.get('alice')).toBe(50)   // paid 100, owes 50 → net +50
    expect(balances.get('bob')).toBe(-50)    // paid 0, owes 50 → net -50
  })

  it('handles three-way even split correctly', () => {
    const expenses: Expense[] = [
      makeExpense('alice', 10, [
        { member_id: 'alice', amount: 3.34 },
        { member_id: 'bob', amount: 3.33 },
        { member_id: 'carol', amount: 3.33 },
      ]),
    ]
    const balances = calculateBalances(expenses)
    expect(balances.get('alice')).toBeCloseTo(6.66, 2)  // paid 10, owes 3.34 → net +6.66
    expect(balances.get('bob')).toBeCloseTo(-3.33, 2)
    expect(balances.get('carol')).toBeCloseTo(-3.33, 2)
    // Verify total balances sum to ~0
    const total = [...balances.values()].reduce((s, v) => s + v, 0)
    expect(Math.abs(total)).toBeLessThan(0.01)
  })

  it('handles multiple expenses', () => {
    const expenses: Expense[] = [
      makeExpense('alice', 60, [
        { member_id: 'alice', amount: 30 },
        { member_id: 'bob', amount: 30 },
      ]),
      makeExpense('bob', 40, [
        { member_id: 'alice', amount: 20 },
        { member_id: 'bob', amount: 20 },
      ]),
    ]
    const balances = calculateBalances(expenses)
    // alice: paid 60, owes 30+20=50 → net +10
    // bob: paid 40, owes 30+20=50 → net -10
    expect(balances.get('alice')).toBe(10)
    expect(balances.get('bob')).toBe(-10)
  })
})

describe('minimumTransactions', () => {
  it('produces one transaction when one person owes another', () => {
    const balances = new Map([['alice', 50], ['bob', -50]])
    const txns = minimumTransactions(balances)
    expect(txns).toHaveLength(1)
    expect(txns[0]).toEqual({ from: 'bob', to: 'alice', amount: 50 })
  })

  it('produces minimum transactions for three people', () => {
    // alice +30, bob -10, carol -20
    const balances = new Map([['alice', 30], ['bob', -10], ['carol', -20]])
    const txns = minimumTransactions(balances)
    expect(txns).toHaveLength(2)
    const total = txns.reduce((s, t) => s + t.amount, 0)
    expect(total).toBe(30)
  })

  it('returns empty array when all balances are zero', () => {
    const balances = new Map([['alice', 0], ['bob', 0]])
    expect(minimumTransactions(balances)).toEqual([])
  })
})
