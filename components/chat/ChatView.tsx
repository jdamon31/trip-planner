'use client'
import { useState, useEffect, useRef } from 'react'
import type { Message } from '@/lib/supabase/types'
import { format, isToday, isYesterday, parseISO } from 'date-fns'

interface ChatViewProps {
  messages: Message[]
  currentMemberId: string
  currentDisplayName: string
  onSend: (content: string) => Promise<void>
  onLoadOlder: () => Promise<void>
}

function dateSeparatorLabel(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d')
}

export function ChatView({ messages, currentMemberId, currentDisplayName, onSend, onLoadOlder }: ChatViewProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    await onSend(trimmed)
    setSending(false)
  }

  // Group messages — insert date separators
  const rendered: Array<{ type: 'date'; label: string } | { type: 'msg'; msg: Message }> = []
  let lastDate = ''
  for (const msg of messages) {
    const day = msg.created_at.slice(0, 10)
    if (day !== lastDate) {
      rendered.push({ type: 'date', label: dateSeparatorLabel(msg.created_at) })
      lastDate = day
    }
    rendered.push({ type: 'msg', msg })
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 112px)' }}>
      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto pb-2 space-y-1">
        {messages.length > 0 && messages.length % 100 === 0 && (
          <button
            onClick={onLoadOlder}
            className="w-full text-xs text-gray-400 py-2 text-center active:text-gray-600"
          >
            Load older messages
          </button>
        )}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold text-gray-700">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to say something!</p>
          </div>
        )}

        {rendered.map((item, i) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${i}`} className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            )
          }

          const { msg } = item
          const isMe = msg.member_id === currentMemberId
          const prevItem = i > 0 ? rendered[i - 1] : null
          const prevMsg = prevItem?.type === 'msg' ? prevItem.msg : null
          const showName = !isMe && prevMsg?.member_id !== msg.member_id

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-1`}>
              <div className={`max-w-[75%] ${isMe ? '' : ''}`}>
                {showName && (
                  <p className="text-xs text-gray-400 font-medium mb-0.5 ml-1">{msg.display_name}</p>
                )}
                <div className={`rounded-2xl px-3.5 py-2 ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                  {format(parseISO(msg.created_at), 'h:mm a')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="flex items-end gap-2 pt-2 pb-1 border-t border-gray-100 bg-white">
        <textarea
          value={text}
          onChange={e => {
            setText(e.target.value)
            // auto-grow
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e as any)
            }
          }}
          placeholder="Message…"
          rows={1}
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden leading-relaxed"
          style={{ minHeight: '42px', maxHeight: '120px' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 disabled:opacity-40 active:bg-blue-700 transition-colors"
          aria-label="Send"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 rotate-90">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
