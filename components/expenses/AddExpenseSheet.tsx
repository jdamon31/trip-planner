'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import type { Member, Expense, ExpenseSplit } from '@/lib/supabase/types'

const CATEGORIES = [
  { id: 'food',       label: 'Food',       emoji: '🍕' },
  { id: 'lodging',    label: 'Lodging',    emoji: '🏨' },
  { id: 'transport',  label: 'Transport',  emoji: '🚗' },
  { id: 'activities', label: 'Activities', emoji: '🎯' },
  { id: 'misc',       label: 'Misc',       emoji: '📦' },
]

type ExpenseParams = {
  paidBy: string
  description: string
  amount: number
  category: string
  expense_date: string
  notes: string | null
  splits: ExpenseSplit[]
}

interface AddExpenseSheetProps {
  members: Member[]
  currentMemberId: string
  initial?: Expense
  onSubmit: (params: ExpenseParams) => Promise<void>
  onUpdate?: (params: Omit<ExpenseParams, 'paidBy'>) => Promise<void>
  onClose: () => void
}

export function AddExpenseSheet({ members, currentMemberId, initial, onSubmit, onUpdate, onClose }: AddExpenseSheetProps) {
  const editing = !!initial
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'misc')
  const [paidBy, setPaidBy] = useState(initial?.paid_by ?? currentMemberId)
  const [included, setIncluded] = useState<Set<string>>(
    new Set(initial ? initial.splits.map(s => s.member_id) : members.map(m => m.id))
  )
  const [customMode, setCustomMode] = useState(!!initial)
  const [customAmounts, setCustomAmounts] = useState<Map<string, string>>(
    initial ? new Map(initial.splits.map(s => [s.member_id, String(s.amount)])) : new Map()
  )
  const [expenseDate, setExpenseDate] = useState(initial?.expense_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const total = parseFloat(amount) || 0
  const splitMembers = members.filter(m => included.has(m.id))
  const equalShare = splitMembers.length > 0 ? total / splitMembers.length : 0
  const customTotal = Array.from(customAmounts.values()).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const remaining = Math.round((total - customTotal) * 100) / 100

  function toggleMember(id: string) {
    setIncluded(prev => {
      if (prev.size === 1 && prev.has(id)) return prev
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setCustomAmounts(new Map())
  }

  function buildSplits(): ExpenseSplit[] | null {
    if (splitMembers.length === 0) return null
    if (!customMode) {
      const base = Math.floor(equalShare * 100) / 100
      const rem = Math.round((total - base * splitMembers.length) * 100) / 100
      return splitMembers.map((m, i) => ({
        member_id: m.id,
        amount: i === splitMembers.length - 1 ? base + rem : base,
      }))
    }
    const splits = splitMembers.map(m => ({
      member_id: m.id,
      amount: parseFloat(customAmounts.get(m.id) || '0') || 0,
    }))
    if (Math.abs(splits.reduce((s, x) => s + x.amount, 0) - total) > 0.01) return null
    return splits
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!description.trim() || total <= 0) return
    const splits = buildSplits()
    if (!splits) { setError('Custom amounts must add up to the total'); return }
    setLoading(true)
    const payload = {
      description: description.trim(),
      amount: total,
      category,
      expense_date: expenseDate,
      notes: notes.trim() || null,
      splits,
    }
    try {
      if (editing && onUpdate) {
        await onUpdate(payload)
      } else {
        await onSubmit({ paidBy, ...payload })
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setLoading(false)
      return
    }
    setLoading(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Amount</label>
        <div className="flex items-center border-2 border-blue-200 rounded-xl px-4 py-3 focus-within:border-blue-500 bg-white">
          <span className="text-2xl font-bold text-gray-400 mr-2">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            autoFocus
            required
            className="flex-1 text-3xl font-bold text-gray-900 focus:outline-none bg-transparent w-full"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What for?</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Airbnb, dinner, gas…"
          required
          className="w-full border rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                category === cat.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Paid by */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Paid by</label>
        <div className="flex gap-2 flex-wrap">
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaidBy(m.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                paidBy === m.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
              }`}
            >
              {m.display_name}{m.id === currentMemberId ? ' (you)' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Split between */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Split between</label>
        <div className="flex gap-2 flex-wrap mb-3">
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMember(m.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                included.has(m.id)
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-white text-gray-400 border-gray-200 line-through'
              }`}
            >
              {m.display_name}{m.id === currentMemberId ? ' (you)' : ''}
            </button>
          ))}
        </div>

        {!customMode ? (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
            <span className="text-sm text-gray-600">
              {splitMembers.length > 0 && total > 0
                ? `$${equalShare.toFixed(2)} each${splitMembers.length > 1 ? ` × ${splitMembers.length}` : ''}`
                : 'Equal split'}
            </span>
            <button type="button" onClick={() => setCustomMode(true)} className="text-sm text-blue-600 font-medium">
              Custom
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
            {splitMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-sm flex-1 text-gray-700">{m.display_name}{m.id === currentMemberId ? ' (you)' : ''}</span>
                <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                  <span className="px-2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={customAmounts.get(m.id) ?? ''}
                    onChange={e => setCustomAmounts(prev => new Map(prev).set(m.id, e.target.value))}
                    placeholder="0.00"
                    className="w-20 py-1.5 pr-2 text-sm text-right focus:outline-none"
                  />
                </div>
              </div>
            ))}
            <div className={`text-sm font-medium text-right pt-1 ${Math.abs(remaining) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
              {Math.abs(remaining) < 0.01 ? '✓ Balanced' : `$${Math.abs(remaining).toFixed(2)} ${remaining > 0 ? 'remaining' : 'over'}`}
            </div>
            <button type="button" onClick={() => { setCustomMode(false); setCustomAmounts(new Map()) }} className="text-xs text-gray-400">
              ← Back to equal split
            </button>
          </div>
        )}
      </div>

      {/* Date + Notes */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={e => setExpenseDate(e.target.value)}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional…"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !description.trim() || total <= 0}
        className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-bold text-base disabled:opacity-50 active:bg-blue-700"
      >
        {loading ? (editing ? 'Saving…' : 'Adding…') : (editing ? 'Save Changes' : 'Add Expense')}
      </button>
    </form>
  )
}
