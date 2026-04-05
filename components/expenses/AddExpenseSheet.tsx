'use client'
import { useState } from 'react'
import type { Member, ExpenseSplit } from '@/lib/supabase/types'

interface AddExpenseSheetProps {
  members: Member[]
  currentMemberId: string
  onSubmit: (params: { paidBy: string; description: string; amount: number; splits: ExpenseSplit[] }) => Promise<void>
  onClose: () => void
}

export function AddExpenseSheet({ members, currentMemberId, onSubmit, onClose }: AddExpenseSheetProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentMemberId)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(members.map(m => m.id)))
  const [customSplits, setCustomSplits] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalAmount = parseFloat(amount) || 0
  const splitMembers = members.filter(m => selectedMembers.has(m.id))
  const equalShare = splitMembers.length > 0 ? totalAmount / splitMembers.length : 0

  function toggleMember(id: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setCustomSplits(new Map())
  }

  function setCustomAmount(memberId: string, value: string) {
    setCustomSplits(prev => new Map(prev).set(memberId, value))
  }

  function buildSplits(): ExpenseSplit[] | null {
    if (splitMembers.length === 0) return null
    if (customSplits.size === 0) {
      const base = Math.floor(equalShare * 100) / 100
      const remainder = Math.round((totalAmount - base * splitMembers.length) * 100) / 100
      return splitMembers.map((m, i) => ({
        member_id: m.id,
        amount: i === splitMembers.length - 1 ? base + remainder : base,
      }))
    }
    const splits = splitMembers.map(m => {
      const custom = customSplits.get(m.id)
      return { member_id: m.id, amount: custom ? parseFloat(custom) : equalShare }
    })
    const sum = splits.reduce((s, x) => s + x.amount, 0)
    if (Math.abs(sum - totalAmount) > 0.01) return null
    return splits
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || totalAmount <= 0) return
    const splits = buildSplits()
    if (!splits) {
      setError('Split amounts must add up to the total')
      return
    }
    setLoading(true)
    await onSubmit({ paidBy, description: description.trim(), amount: totalAmount, splits })
    setLoading(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Airbnb, groceries, gas…"
          className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="0.00" min="0.01" step="0.01"
          className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
        <select value={paidBy} onChange={e => setPaidBy(e.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.display_name}{m.id === currentMemberId ? ' (you)' : ''}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Split between</label>
        <div className="space-y-2">
          {members.map(m => {
            const selected = selectedMembers.has(m.id)
            const customVal = customSplits.get(m.id) ?? ''
            return (
              <div key={m.id} className="flex items-center gap-3">
                <input type="checkbox" checked={selected} onChange={() => toggleMember(m.id)} className="w-4 h-4 rounded" />
                <span className="text-sm flex-1">{m.display_name}{m.id === currentMemberId ? ' (you)' : ''}</span>
                {selected && totalAmount > 0 && (
                  <input type="number" value={customVal || equalShare.toFixed(2)} onChange={e => setCustomAmount(m.id, e.target.value)}
                    step="0.01" min="0"
                    className="w-20 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
            )
          })}
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50">
        {loading ? 'Adding…' : 'Add Expense'}
      </button>
    </form>
  )
}
