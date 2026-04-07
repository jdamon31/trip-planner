'use client'
import { useState } from 'react'

type CreatePollFormProps = {
  onSubmit: (question: string, options: string[], allowMultiple: boolean) => Promise<void>
  onCancel: () => void
}

export function CreatePollForm({ onSubmit, onCancel }: CreatePollFormProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [loading, setLoading] = useState(false)

  function updateOption(i: number, value: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? value : o))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validOptions = options.filter(o => o.trim())
    if (!question.trim() || validOptions.length < 2) return
    setLoading(true)
    await onSubmit(question.trim(), validOptions, allowMultiple)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
      <h3 className="font-semibold text-gray-800">New Poll</h3>
      <input
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="What are we voting on?"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <div className="space-y-2">
        {options.map((opt, i) => (
          <input
            key={i}
            type="text"
            value={opt}
            onChange={e => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ))}
        <button type="button" onClick={() => setOptions(prev => [...prev, ''])} className="text-sm text-blue-600 font-medium">
          + Add option
        </button>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setAllowMultiple(v => !v)}
          className={`relative w-10 h-6 rounded-full transition-colors ${allowMultiple ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowMultiple ? 'translate-x-5' : 'translate-x-1'}`} />
        </div>
        <span className="text-sm text-gray-700">Allow multiple selections</span>
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">
          Create Poll
        </button>
        <button type="button" onClick={onCancel} className="flex-1 border rounded-lg py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
