'use client'
import { useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

type TripPhotoProps = {
  tripId: string
  photoUrl: string | null
  tripName: string
}

export function TripPhoto({ tripId, photoUrl, tripName }: TripPhotoProps) {
  const [current, setCurrent] = useState<string | null>(photoUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = tripName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const supabase = getSupabaseClient()
    // Sanitise filename — remove spaces and special characters
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${tripId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('trip-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('trip-photos').getPublicUrl(path)

    await fetch(`/api/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_url: publicUrl }),
    })

    setCurrent(publicUrl)
    setUploading(false)

    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => inputRef.current?.click()}
        className="w-16 h-16 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center border-2 border-white shadow"
        aria-label="Change trip photo"
        disabled={uploading}
      >
        {current ? (
          <img src={current} alt={tripName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-blue-600 font-bold text-lg">{initials}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">…</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && (
        <p className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap">{error}</p>
      )}
    </div>
  )
}
