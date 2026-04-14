'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/supabase/types'

const PAGE_SIZE = 100

export function useMessages(tripId: string, currentMemberId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [lastSeen, setLastSeen] = useState<string>(() => {
    if (typeof window === 'undefined') return new Date(0).toISOString()
    return localStorage.getItem(`chat_last_seen_${tripId}`) ?? new Date(0).toISOString()
  })
  const messagesRef = useRef<Message[]>([])
  messagesRef.current = messages

  const load = useCallback(async () => {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (data) setMessages(data.reverse() as Message[])
  }, [tripId])

  useEffect(() => {
    load()

    let lastRefresh = Date.now()
    function handleVisibility() {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 30_000) {
        lastRefresh = Date.now()
        load()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`messages-${tripId}`)
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages', filter: `trip_id=eq.${tripId}` }, (payload) => {
        const incoming = payload.new as Message
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev
          return [...prev, incoming]
        })
      })
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [tripId, load])

  async function loadOlder() {
    const current = messagesRef.current
    if (!current.length) return
    const oldest = current[0].created_at
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('trip_id', tripId)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (data?.length) setMessages(prev => [...(data.reverse() as Message[]), ...prev])
  }

  function markRead() {
    const now = new Date().toISOString()
    localStorage.setItem(`chat_last_seen_${tripId}`, now)
    setLastSeen(now)
  }

  async function sendMessage(memberId: string, displayName: string, content: string) {
    const supabase = getSupabaseClient()
    await supabase.from('messages').insert({
      trip_id: tripId,
      member_id: memberId,
      display_name: displayName,
      content: content.trim(),
    })
  }

  const unreadCount = messages.filter(
    m => m.created_at > lastSeen && m.member_id !== currentMemberId
  ).length

  return { messages, sendMessage, loadOlder, unreadCount, markRead }
}
