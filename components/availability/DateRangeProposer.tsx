'use client'
import { useState } from 'react'

interface DateRangeProposerProps {
  onPropose: (start: string, end: string) => void
}

export function DateRangeProposer({ onPropose }: DateRangeProposerProps) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [open, setOpen] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!start || !end || start > end) return
    onPropose(start, end)
    setOpen(false)
    setStart('')
    setEnd('')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600 font-medium mb-3 flex items-center gap-1"
      >
        + Propose dates
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-3 mb-4 space-y-2">
      <p className="text-sm font-medium text-gray-700">Propose a date range</p>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500">To</label>
          <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium">
          Add dates
        </button>
        <button type="button" onClick={() => setOpen(false)} className="flex-1 border rounded-lg py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
