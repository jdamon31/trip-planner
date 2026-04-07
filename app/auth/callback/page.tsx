'use client'
import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const exchanged = useRef(false)

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    const code = searchParams.get('code')
    const rawNext = searchParams.get('next') ?? '/'
    const next = rawNext.startsWith('/') ? rawNext : '/'

    if (!code) {
      router.replace(next)
      return
    }

    getSupabaseClient()
      .auth.exchangeCodeForSession(code)
      .then(() => router.replace(next))
      .catch(() => router.replace('/'))
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
