'use client'
import { useCallback } from 'react'

const STORAGE_KEY_PREFIX = 'trip_member_'

export interface StoredMember {
  memberId: string
  displayName: string
}

export function getMemberFromStorage(tripId: string): StoredMember | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tripId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveMemberToStorage(tripId: string, member: StoredMember): void {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${tripId}`, JSON.stringify(member))
}

export function useMember(tripId: string) {
  const getMember = useCallback(() => getMemberFromStorage(tripId), [tripId])
  const saveMember = useCallback(
    (member: StoredMember) => saveMemberToStorage(tripId, member),
    [tripId]
  )
  return { getMember, saveMember }
}
