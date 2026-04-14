'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { SignInButtons } from '@/components/auth/SignInButtons'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Trip } from '@/lib/supabase/types'
import { Skeleton } from '@/components/ui/Skeleton'

type MyTrip = Trip & { memberCount: number }

function tripInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

// ─── App Mock UI shown in hero ────────────────────────────────────────────────

function AppMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1000 }}
      className="relative w-full max-w-[340px] mx-auto lg:mx-0 lg:ml-auto"
    >
      {/* Floating badge — top right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5, type: 'spring' }}
        className="absolute -top-4 -right-4 z-20 bg-white rounded-full shadow-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: '#3E2C23', fontFamily: 'var(--font-dm)' }}
      >
        <span>✅</span>
        <span>Trip dates set!</span>
      </motion.div>

      {/* Floating badge — bottom left */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.5, type: 'spring' }}
        className="absolute -bottom-4 -left-4 z-20 bg-white rounded-full shadow-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: '#6B8E23', fontFamily: 'var(--font-dm)' }}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>4 people voted</span>
      </motion.div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-black/5"
        style={{ boxShadow: '0 25px 60px rgba(62,44,35,0.18), 0 8px 20px rgba(62,44,35,0.08)' }}>

        {/* Card header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6B8E23 0%, #8FA84A 100%)' }}>
              Y
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Yosemite Weekend</p>
              <p className="text-xs text-gray-400">📍 Yosemite, CA · 5 people</p>
            </div>
          </div>
          {/* Mini tab bar */}
          <div className="flex gap-3 mt-3">
            {['Details', 'When', 'Itinerary', 'Chat'].map((tab, i) => (
              <span key={tab} className={`text-xs pb-1 ${i === 1 ? 'font-semibold border-b-2' : 'text-gray-400'}`}
                style={{ borderColor: i === 1 ? '#6B8E23' : 'transparent', color: i === 1 ? '#6B8E23' : undefined }}>
                {tab}
              </span>
            ))}
          </div>
        </div>

        {/* Range cards */}
        <div className="p-3 space-y-2.5 bg-[#FAF8EF]">
          {/* Best match card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-bold text-gray-900">May 16–18</p>
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">✨ Best match</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">Fri–Sun · 3 days</p>
              <div className="flex flex-wrap gap-1">
                {[['Alex', 'yes'], ['Sam', 'yes'], ['Jordan', 'partial'], ['Maya', 'yes']].map(([name, status]) => (
                  <span key={name} className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                    status === 'yes' ? 'bg-green-100 text-green-800' :
                    status === 'partial' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-50 text-red-500'
                  }`}>
                    {status === 'yes' ? '✓' : status === 'partial' ? '~' : '✗'} {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Second range card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-bold text-gray-900">May 23–25</p>
              </div>
              <p className="text-xs text-gray-400 mb-2">Fri–Sun · 3 days</p>
              <div className="flex flex-wrap gap-1">
                {[['Alex', 'yes'], ['Sam', 'no'], ['Jordan', 'yes'], ['Maya', 'partial']].map(([name, status]) => (
                  <span key={name} className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                    status === 'yes' ? 'bg-green-100 text-green-800' :
                    status === 'partial' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-50 text-red-500'
                  }`}>
                    {status === 'yes' ? '✓' : status === 'partial' ? '~' : '✗'} {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Scroll-reveal wrapper ─────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px 0px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Full landing page ─────────────────────────────────────────────────────────

function LandingPage({
  user, authLoading, onSignInToggle, showSignIn,
  name, setName, destination, setDestination,
  creating, createError, handleCreate,
}: any) {
  const [scrolled, setScrolled] = useState(false)
  const createRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  function scrollToCreate() {
    createRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const display: React.CSSProperties = { fontFamily: 'var(--font-playfair)' }

  return (
    <div style={{ background: '#FAF8EF', color: '#3E2C23' }}>

      {/* ── Nav ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#FAF8EF]/95 backdrop-blur-sm shadow-sm' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" style={display}>Tripkit</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how" className="text-sm text-[#3E2C23]/60 hover:text-[#3E2C23] transition-colors">How it works</a>
            <a href="#features" className="text-sm text-[#3E2C23]/60 hover:text-[#3E2C23] transition-colors">Features</a>
          </nav>
          <div className="flex items-center gap-3">
            {!authLoading && (
              user ? (
                <span className="text-sm text-[#3E2C23]/50">Hi, {user.email?.split('@')[0]}</span>
              ) : (
                <button onClick={onSignInToggle} className="text-sm text-[#3E2C23]/60 hover:text-[#3E2C23] transition-colors">
                  Sign in
                </button>
              )
            )}
            <button
              onClick={scrollToCreate}
              className="text-sm font-semibold px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
              style={{ background: '#3E2C23', color: '#FAF8EF' }}
            >
              Plan a trip →
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 55% 70% at 90% 5%, rgba(107,142,35,0.15) 0%, transparent 65%),
            radial-gradient(ellipse 45% 55% at 10% 90%, rgba(210,105,30,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 55% 55%, rgba(184,134,95,0.08) 0%, transparent 75%),
            #FAF8EF`
        }} />
        {/* Subtle grain */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px',
        }} />

        <div className="relative max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center py-24">
          {/* Left: Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-8 px-3 py-1.5 rounded-full border"
              style={{ color: '#6B8E23', borderColor: 'rgba(107,142,35,0.3)', background: 'rgba(107,142,35,0.06)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B8E23]" />
              Group trip planning
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl lg:text-7xl xl:text-8xl leading-none mb-6"
              style={{ ...display, letterSpacing: '-0.02em', color: '#3E2C23' }}
            >
              Plan trips.{' '}
              <span className="italic" style={{ color: '#D2691E' }}>Everyone's</span>
              <br />in.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-lg text-[#3E2C23]/65 leading-relaxed mb-10 max-w-md"
            >
              Coordinate dates, split costs, and build your itinerary together — no account, no app download, no friction.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={scrollToCreate}
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base transition-all hover:scale-105 active:scale-95"
                style={{ background: '#3E2C23', color: '#FAF8EF' }}
              >
                Start planning free
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base border transition-all hover:bg-[#3E2C23]/5"
                style={{ borderColor: 'rgba(62,44,35,0.2)', color: '#3E2C23' }}
              >
                See how it works
              </a>
            </motion.div>
          </div>

          {/* Right: App mockup */}
          <div className="flex justify-center lg:justify-end">
            <AppMockup />
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs tracking-widest uppercase text-[#3E2C23]/30">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="w-px h-8 bg-gradient-to-b from-[#3E2C23]/30 to-transparent"
          />
        </motion.div>
      </section>

      {/* ── Trust strip ── */}
      <section style={{ background: '#3E2C23' }}>
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-3">
            {[
              ['✦', 'No account needed'],
              ['✦', 'Real-time sync'],
              ['✦', 'Works on any device'],
              ['✦', 'Completely free'],
              ['✦', 'Share with one link'],
            ].map(([icon, text]) => (
              <span key={text} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(250,248,239,0.65)' }}>
                <span style={{ color: '#D2691E', fontSize: 8 }}>{icon}</span>
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-28 lg:py-36" style={{ background: '#F5F0E8' }}>
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#D2691E' }}>How it works</p>
            <h2 className="text-4xl lg:text-5xl mb-20" style={{ ...display, letterSpacing: '-0.02em' }}>
              Three steps,<br />
              <span className="italic">one group chat later.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                n: '01',
                title: 'Create your trip',
                body: 'Name it, add a destination, and get a shareable link. No accounts required for anyone in the group.',
                icon: '✈️',
              },
              {
                n: '02',
                title: 'Vote on dates together',
                body: 'Propose date ranges. Everyone votes yes, partial, or can\'t. The best match surfaces automatically.',
                icon: '📅',
              },
              {
                n: '03',
                title: 'Plan every detail',
                body: 'Build a day-by-day itinerary, split expenses fairly, and keep the whole group in one chat.',
                icon: '🗺️',
              },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.12}>
                <div className="relative">
                  <span
                    className="block text-8xl lg:text-9xl font-black leading-none mb-4 select-none"
                    style={{ ...display, color: 'rgba(62,44,35,0.07)', letterSpacing: '-0.04em' }}
                  >
                    {step.n}
                  </span>
                  <div className="text-3xl mb-3 -mt-6">{step.icon}</div>
                  <h3 className="text-xl font-bold mb-3" style={{ color: '#3E2C23' }}>{step.title}</h3>
                  <p className="text-[#3E2C23]/60 leading-relaxed">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 lg:py-36" style={{ background: '#FAF8EF' }}>
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#D2691E' }}>Everything you need</p>
            <h2 className="text-4xl lg:text-5xl mb-16" style={{ ...display, letterSpacing: '-0.02em' }}>
              Built for the way<br />
              <span className="italic">groups actually plan.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '📅', title: 'Date range voting', body: 'Propose weekends and windows. Everyone votes ✓ In, ~ Partial, or ✗ Can\'t. The top-scoring range gets a Best Match badge.', delay: 0 },
              { icon: '💬', title: 'Group chat', body: 'Real-time messaging built right in. No separate thread needed — the whole group is already here.', delay: 0.06 },
              { icon: '💸', title: 'Expense splitting', body: 'Log who paid what with custom splits. A live balance summary shows exactly who owes whom.', delay: 0.12 },
              { icon: '🗺️', title: 'Day-by-day itinerary', body: 'Build a real itinerary with times and locations. Drag to reorder, move between days, everyone sees updates live.', delay: 0.04 },
              { icon: '🔗', title: 'One link, everyone in', body: 'Share a single URL. Anyone who opens it can join — no app download, no account, no friction.', delay: 0.1 },
              { icon: '🗳️', title: 'Group polls', body: 'Can\'t agree on a restaurant? Quick polls with single or multi-select options. Real-time results.', delay: 0.08 },
            ].map(f => (
              <Reveal key={f.title} delay={f.delay}>
                <FeatureCard icon={f.icon} title={f.title} body={f.body} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Create trip CTA ── */}
      <section ref={createRef as any} style={{ background: '#3E2C23' }} className="py-28 lg:py-36">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <Reveal>
              <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(250,248,239,0.4)' }}>
                Get started free
              </p>
              <h2 className="text-4xl lg:text-6xl mb-6 text-[#FAF8EF]" style={{ ...display, letterSpacing: '-0.02em' }}>
                Your next trip<br />
                <span className="italic" style={{ color: '#D2691E' }}>starts right here.</span>
              </h2>
              <p className="text-[#FAF8EF]/50 leading-relaxed">
                Create a trip in seconds. Share the link. Start planning — together.
              </p>
            </Reveal>

            {/* Right: Form */}
            <Reveal delay={0.15}>
              <div className="bg-[#FAF8EF] rounded-2xl p-6">
                {/* Sign-in strip */}
                {showSignIn && !user && (
                  <div className="mb-5 pb-5 border-b border-[#3E2C23]/10">
                    <p className="text-xs text-[#3E2C23]/50 mb-3 text-center">Sign in to save trips across devices</p>
                    <SignInButtons redirectTo="/" />
                  </div>
                )}

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#3E2C23]/50 mb-1.5">Trip name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Weekend in Ojai"
                      className="w-full border-2 border-[#3E2C23]/10 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:border-[#6B8E23] transition-colors"
                      style={{ color: '#3E2C23' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#3E2C23]/50 mb-1.5">Destination (optional)</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                      placeholder="Yosemite National Park"
                      className="w-full border-2 border-[#3E2C23]/10 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:border-[#6B8E23] transition-colors"
                      style={{ color: '#3E2C23' }}
                    />
                  </div>
                  {createError && <p className="text-red-600 text-sm">{createError}</p>}
                  <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="w-full py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                    style={{ background: '#D2691E', color: '#FAF8EF' }}
                  >
                    {creating ? 'Creating trip…' : 'Create trip →'}
                  </button>
                </form>

                {!user && !showSignIn && (
                  <p className="text-center text-xs text-[#3E2C23]/40 mt-4">
                    Want to see your trips across devices?{' '}
                    <button onClick={handleSignInToggleFromForm} className="underline text-[#3E2C23]/60">Sign in</button>
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#2A1E18' }} className="py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg text-[#FAF8EF]/80" style={display}>Tripkit</span>
          <p className="text-xs text-[#FAF8EF]/25">Plan together, go together.</p>
          <p className="text-xs text-[#FAF8EF]/25">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )

  function handleSignInToggleFromForm() {
    onSignInToggle()
    // scroll up slightly so sign-in panel is visible
    createRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl p-6 h-full" style={{ background: '#F5F0E8', border: '1px solid rgba(62,44,35,0.06)' }}>
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2" style={{ color: '#3E2C23' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(62,44,35,0.6)' }}>{body}</p>
    </div>
  )
}

// ─── Dashboard for logged-in users with trips ──────────────────────────────────

function Dashboard({ user, myTrips, tripsLoading, router, name, setName, destination, setDestination, creating, createError, handleCreate, signOut }: any) {
  const display: React.CSSProperties = { fontFamily: 'var(--font-playfair)' }
  return (
    <main className="min-h-screen" style={{ background: '#FAF8EF' }}>
      {/* Header */}
      <header style={{ background: '#3E2C23' }} className="px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-xl text-[#FAF8EF]" style={display}>Tripkit</span>
          <button onClick={signOut} className="text-xs text-[#FAF8EF]/50 border border-[#FAF8EF]/20 rounded-full px-3 py-1.5 hover:border-[#FAF8EF]/40 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* My trips */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3E2C23]/40 mb-4">My Trips</p>
          {tripsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {myTrips.map((trip: MyTrip) => (
                <button
                  key={trip.id}
                  onClick={() => router.push(`/trips/${trip.id}`)}
                  className="w-full bg-white rounded-xl border border-[#3E2C23]/08 text-left transition-all hover:border-[#3E2C23]/20 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 font-bold text-sm text-white"
                      style={{ background: trip.photo_url ? undefined : 'linear-gradient(135deg, #6B8E23 0%, #8FA84A 100%)' }}>
                      {trip.photo_url
                        ? <img src={trip.photo_url} alt={trip.name} className="w-full h-full object-cover" />
                        : tripInitials(trip.name)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#3E2C23]">{trip.name}</div>
                      {trip.destination && <div className="text-sm text-[#3E2C23]/50 mt-0.5">📍 {trip.destination}</div>}
                      <div className="text-xs text-[#3E2C23]/35 mt-1">
                        {trip.memberCount} member{trip.memberCount !== 1 ? 's' : ''}
                        {trip.confirmed_dates?.[0] ? ` · ${format(parseISO(trip.confirmed_dates[0]), 'MMM d, yyyy')}` : ''}
                      </div>
                    </div>
                    <span className="text-[#3E2C23]/25 text-sm">›</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create new */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3E2C23]/40 mb-4">New trip</p>
          <div className="bg-white rounded-2xl border border-[#3E2C23]/08 p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#3E2C23]/40 mb-1.5">Trip name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Weekend in Ojai"
                  className="w-full border-2 border-[#3E2C23]/10 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#6B8E23] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#3E2C23]/40 mb-1.5">Destination (optional)</label>
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="Yosemite National Park"
                  className="w-full border-2 border-[#3E2C23]/10 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#6B8E23] transition-colors"
                />
              </div>
              {createError && <p className="text-red-600 text-sm">{createError}</p>}
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
                style={{ background: '#D2691E' }}
              >
                {creating ? 'Creating…' : 'Create trip →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Root page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [myTrips, setMyTrips] = useState<MyTrip[]>([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    if (!user) { setMyTrips([]); return }
    setTripsLoading(true)
    const supabase = getSupabaseClient()
    supabase
      .from('members')
      .select('trip_id, trips(*)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) { setTripsLoading(false); return }
        const trips = data.map((row: any) => row.trips as Trip).filter(Boolean)
        Promise.all(
          trips.map(trip =>
            supabase.from('members').select('id', { count: 'exact', head: true }).eq('trip_id', trip.id)
              .then(({ count }) => ({ ...trip, memberCount: count ?? 0 }))
          )
        ).then(results => { setMyTrips(results); setTripsLoading(false) })
      })
  }, [user])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setCreateError('')
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, destination, createdByUserId: user?.id ?? null }),
    })
    const data = await res.json()
    if (!res.ok) { setCreateError(data.error || 'Failed to create trip'); setCreating(false); return }
    router.push(`/trips/${data.id}/join`)
  }

  // Logged-in users with trips → dashboard
  if (!authLoading && user && (tripsLoading || myTrips.length > 0)) {
    return (
      <Dashboard
        user={user}
        myTrips={myTrips}
        tripsLoading={tripsLoading}
        router={router}
        name={name} setName={setName}
        destination={destination} setDestination={setDestination}
        creating={creating}
        createError={createError}
        handleCreate={handleCreate}
        signOut={signOut}
      />
    )
  }

  return (
    <LandingPage
      user={user}
      authLoading={authLoading}
      showSignIn={showSignIn}
      onSignInToggle={() => setShowSignIn(s => !s)}
      name={name} setName={setName}
      destination={destination} setDestination={setDestination}
      creating={creating}
      createError={createError}
      handleCreate={handleCreate}
    />
  )
}
