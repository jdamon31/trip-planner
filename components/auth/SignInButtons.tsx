'use client'
import { getSupabaseClient } from '@/lib/supabase/client'

type SignInButtonsProps = {
  redirectTo?: string
}

export function SignInButtons({ redirectTo = '/' }: SignInButtonsProps) {
  async function signIn(provider: 'google' | 'apple') {
    const supabase = getSupabaseClient()
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    })
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => signIn('google')}
        className="w-full flex items-center justify-center gap-3 border rounded-lg py-3 text-sm font-medium bg-white active:bg-gray-50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Sign in with Google
      </button>

      <button
        onClick={() => signIn('apple')}
        className="w-full flex items-center justify-center gap-3 border rounded-lg py-3 text-sm font-medium bg-black text-white active:bg-gray-900"
      >
        <svg width="16" height="18" viewBox="0 0 814 1000" fill="white" aria-hidden="true">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.2-150.3-109.1c-51.1-75.2-91.8-194.3-91.8-307.3C19.1 196.1 136.7 26 295.1 26c74.3 0 136.3 48 182.3 48 43.8 0 113.3-51.2 197.2-51.2 32.6 0 117.1 2.6 178.3 95.1zm-234.8-181.3c31.4-37.9 53.9-90.7 53.9-143.5 0-7.5-.6-15.1-1.9-22c-51.4 2-112.1 34.5-149.7 79.1-27.5 31.4-54.5 84.1-54.5 137.7 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.4 1.3 13.6 1.3 46.5 0 103.8-30.8 136.7-71.8z"/>
        </svg>
        Sign in with Apple
      </button>
    </div>
  )
}
