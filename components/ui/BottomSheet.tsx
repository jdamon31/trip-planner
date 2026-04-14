'use client'
import { useEffect } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#FAF8EF' }}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b sticky top-0" style={{ background: '#FAF8EF', borderColor: 'rgba(62,44,35,0.08)' }}>
          <h2 className="font-semibold" style={{ color: '#3E2C23' }}>{title}</h2>
          <button onClick={onClose} className="text-lg leading-none p-1 transition-opacity hover:opacity-60" style={{ color: 'rgba(62,44,35,0.4)' }}>✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
