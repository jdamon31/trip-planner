'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { TripLink } from '@/lib/supabase/types'

interface TripLinksProps {
  tripId: string
  memberId: string
}

export function TripLinks({ tripId, memberId }: TripLinksProps) {
  const [links, setLinks] = useState<TripLink[]>([])
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.from('trip_links').select('*').eq('trip_id', tripId).then(({ data }) => {
      if (data) setLinks(data as TripLink[])
    })
  }, [tripId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !url.trim()) return
    setAdding(true)
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('trip_links')
      .insert({ trip_id: tripId, label: label.trim(), url: url.trim(), added_by: memberId })
      .select()
      .single()
    if (data) setLinks(prev => [...prev, data as TripLink])
    setLabel('')
    setUrl('')
    setShowForm(false)
    setAdding(false)
  }

  return (
    <div className="bg-white rounded-xl border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-700">Links</h3>
        <button onClick={() => setShowForm(f => !f)} className="text-blue-600 text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-2 mb-3">
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (e.g. Airbnb listing)"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={adding}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            Add Link
          </button>
        </form>
      )}

      {links.length === 0 && !showForm && (
        <p className="text-sm text-gray-400">No links yet</p>
      )}

      <ul className="space-y-2">
        {links.map(link => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              🔗 {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
