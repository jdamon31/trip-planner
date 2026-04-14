'use client'
import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'

type TripMenuProps = {
  tripName: string
  isCreator: boolean
  onLeave: () => Promise<void>
  onDelete: () => Promise<void>
  onEdit: () => void
}

export function TripMenu({ tripName, isCreator, onLeave, onDelete, onEdit }: TripMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleLeave() {
    if (isCreator) {
      setConfirm('delete')
      return
    }
    setConfirm('leave')
  }

  async function handleConfirm() {
    setBusy(true)
    if (confirm === 'leave') await onLeave()
    if (confirm === 'delete') await onDelete()
    setBusy(false)
    setConfirm(null)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-gray-400 active:text-gray-600"
        aria-label="Trip menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="10" cy="4" r="1.5"/>
          <circle cx="10" cy="10" r="1.5"/>
          <circle cx="10" cy="16" r="1.5"/>
        </svg>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Trip options">
        <div className="space-y-2 pb-2">
          {isCreator && (
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full text-left px-4 py-3 rounded-lg text-gray-800 font-medium active:bg-gray-50"
            >
              Edit trip details
            </button>
          )}
          <button
            onClick={handleLeave}
            className="w-full text-left px-4 py-3 rounded-lg text-red-600 font-medium active:bg-red-50"
          >
            Leave trip
          </button>
          {isCreator && (
            <button
              onClick={() => setConfirm('delete')}
              className="w-full text-left px-4 py-3 rounded-lg text-red-700 font-semibold active:bg-red-50"
            >
              Delete trip
            </button>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'delete' ? 'Delete trip?' : 'Leave trip?'}
      >
        <div className="space-y-4 pb-2">
          {confirm === 'delete' && isCreator && (
            <p className="text-sm text-gray-600">
              This will permanently delete <strong>{tripName}</strong> and all its data for everyone.
            </p>
          )}
          {confirm === 'delete' && !isCreator && (
            <p className="text-sm text-gray-600">
              You created this trip. To leave, you need to delete it for everyone.
            </p>
          )}
          {confirm === 'leave' && (
            <p className="text-sm text-gray-600">
              You'll lose access to <strong>{tripName}</strong> unless you rejoin.
            </p>
          )}
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="w-full bg-red-600 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50 active:bg-red-700"
          >
            {busy ? '…' : confirm === 'delete' ? 'Delete forever' : 'Leave trip'}
          </button>
          <button
            onClick={() => setConfirm(null)}
            className="w-full border rounded-lg py-3 text-sm"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
