# Group Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, no-account group trip planning website where anyone with an invite link can collaborate on availability, polls, expenses, and itinerary.

**Architecture:** Next.js App Router frontend + Supabase (Postgres + real-time) backend. No authentication — members are identified by a UUID stored in localStorage per trip. All collaboration features (availability grid, polls, expenses, itinerary) live on a single tabbed trip page.

**Tech Stack:** Next.js 14, Supabase JS v2, Tailwind CSS, TypeScript, Jest + React Testing Library, @dnd-kit/core (drag-to-reorder), date-fns

---

## File Map

```
app/
  layout.tsx                         Root layout (Tailwind, viewport meta)
  page.tsx                           Landing page + trip creation form
  trips/[id]/
    layout.tsx                       Load trip data, check/redirect for member identity
    page.tsx                         Tabbed trip page (Details, Availability, Polls, Expenses)
    join/page.tsx                    Enter display name, create member row, store in localStorage

components/
  ui/
    TabBar.tsx                       Bottom mobile tab bar (4 tabs)
    BottomSheet.tsx                  Reusable slide-up modal sheet
  trip/
    TripHeader.tsx                   Name, destination, confirmed date display
    TripNotes.tsx                    Editable free-text notes (last-write-wins)
    TripLinks.tsx                    Add/display labeled links
  availability/
    AvailabilityGrid.tsx             Full grid: dates as columns, members as rows
    AvailabilityCell.tsx             Single tappable cell (available/maybe/unavailable)
    BestDateBanner.tsx               Pinned banner showing top 1-2 dates
    DateRangeProposer.tsx            Mini-calendar for proposing/expanding date range
  polls/
    PollList.tsx                     List of PollCards + CreatePollForm trigger
    PollCard.tsx                     Single poll: question, vote buttons, results bar chart
    CreatePollForm.tsx               Form: question + dynamic options
  expenses/
    BalancesSummary.tsx              Net balances per member (pinned at top)
    ExpenseList.tsx                  Chronological log of expenses
    AddExpenseSheet.tsx              BottomSheet form: description, amount, payer, splits
  itinerary/
    ItineraryList.tsx                @dnd-kit drag-reorderable list of items
    AddItineraryForm.tsx             Inline form to add itinerary item

hooks/
  useMember.ts                       Read/write member_id + display_name from localStorage
  useTrip.ts                         Fetch trip row + real-time subscription
  useAvailability.ts                 Fetch availability rows + upsert mutation
  usePolls.ts                        Fetch polls + votes + create/vote/delete mutations
  useExpenses.ts                     Fetch expenses + create mutation

lib/
  supabase/
    client.ts                        Browser Supabase client singleton
    server.ts                        Server Supabase client (for server components)
    types.ts                         TypeScript types matching DB schema
  utils/
    availability.ts                  rankDates(), getBestDates() — pure functions
    expenses.ts                      calculateBalances(), minimumTransactions() — pure functions

supabase/
  migrations/
    001_initial_schema.sql           All tables + indexes + RLS policies
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (via CLI)
- Create: `tailwind.config.ts`
- Create: `app/layout.tsx`
- Create: `.env.local.example`

- [ ] **Step 1: Scaffold Next.js project**

Run in the project root (`/Users/jonnydamon/claude-projects/ios-task-app`):
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --yes
```
Expected: Next.js project created with TypeScript, Tailwind, App Router.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js date-fns @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install -D jest @types/jest ts-jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Update root layout for mobile-first**

Replace `app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Trip Planner',
  description: 'Plan trips with your group',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Create .env.local.example**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 6: Verify project runs**

```bash
npm run dev
```
Expected: Server starts on http://localhost:3000, default Next.js page renders.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, Supabase, dnd-kit, Jest"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com, create a new project. Copy the project URL and anon key.

Create `.env.local` (not committed):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 2: Write migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Trips
create table trips (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  destination   text,
  description   text,
  confirmed_date date,
  created_at    timestamptz default now()
);

-- Members (anonymous, identified by UUID stored in localStorage)
create table members (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references trips on delete cascade,
  display_name  text not null,
  joined_at     timestamptz default now()
);

-- Availability
create table availability (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members on delete cascade,
  date        date not null,
  status      text not null check (status in ('available', 'maybe', 'unavailable')),
  unique(member_id, date)
);

-- Polls
create table polls (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  created_by  uuid not null references members on delete cascade,
  question    text not null,
  options     jsonb not null,  -- [{id: string, label: string}]
  created_at  timestamptz default now()
);

-- Votes (one per member per poll)
create table votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references polls on delete cascade,
  member_id   uuid not null references members on delete cascade,
  option_id   text not null,
  unique(poll_id, member_id)
);

-- Expenses
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  paid_by     uuid not null references members on delete cascade,
  description text not null,
  amount      numeric(10,2) not null,
  splits      jsonb not null,  -- [{member_id: string, amount: number}]
  created_at  timestamptz default now()
);

-- Itinerary items
create table itinerary_items (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  day         date,
  time        time,
  activity    text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

-- Trip links
create table trip_links (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  label       text not null,
  url         text not null,
  added_by    uuid references members on delete set null
);

-- Indexes for common queries
create index on members(trip_id);
create index on availability(member_id);
create index on polls(trip_id);
create index on votes(poll_id);
create index on expenses(trip_id);
create index on itinerary_items(trip_id, sort_order);
create index on trip_links(trip_id);

-- RLS: enable for all tables, allow all operations (no auth in v1)
alter table trips enable row level security;
alter table members enable row level security;
alter table availability enable row level security;
alter table polls enable row level security;
alter table votes enable row level security;
alter table expenses enable row level security;
alter table itinerary_items enable row level security;
alter table trip_links enable row level security;

create policy "public read/write trips" on trips for all using (true) with check (true);
create policy "public read/write members" on members for all using (true) with check (true);
create policy "public read/write availability" on availability for all using (true) with check (true);
create policy "public read/write polls" on polls for all using (true) with check (true);
create policy "public read/write votes" on votes for all using (true) with check (true);
create policy "public read/write expenses" on expenses for all using (true) with check (true);
create policy "public read/write itinerary_items" on itinerary_items for all using (true) with check (true);
create policy "public read/write trip_links" on trip_links for all using (true) with check (true);
```

- [ ] **Step 3: Run migration in Supabase**

In the Supabase dashboard → SQL Editor, paste and run the migration. Verify all 8 tables appear in the Table Editor.

- [ ] **Step 4: Commit migration file**

```bash
git add supabase/
git commit -m "feat: add initial database schema with RLS policies"
```

---

## Task 3: Supabase Client + TypeScript Types

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/types.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

let client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function getSupabaseServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create TypeScript types**

Create `lib/supabase/types.ts`:
```typescript
export type AvailabilityStatus = 'available' | 'maybe' | 'unavailable'

export interface PollOption {
  id: string
  label: string
}

export interface ExpenseSplit {
  member_id: string
  amount: number
}

export interface Trip {
  id: string
  name: string
  destination: string | null
  description: string | null
  confirmed_date: string | null
  created_at: string
}

export interface Member {
  id: string
  trip_id: string
  display_name: string
  joined_at: string
}

export interface Availability {
  id: string
  member_id: string
  date: string
  status: AvailabilityStatus
}

export interface Poll {
  id: string
  trip_id: string
  created_by: string
  question: string
  options: PollOption[]
  created_at: string
}

export interface Vote {
  id: string
  poll_id: string
  member_id: string
  option_id: string
}

export interface Expense {
  id: string
  trip_id: string
  paid_by: string
  description: string
  amount: number
  splits: ExpenseSplit[]
  created_at: string
}

export interface ItineraryItem {
  id: string
  trip_id: string
  day: string | null
  time: string | null
  activity: string
  sort_order: number
  created_at: string
}

export interface TripLink {
  id: string
  trip_id: string
  label: string
  url: string
  added_by: string | null
}

// Supabase generic Database type (used for createClient<Database>)
export type Database = {
  public: {
    Tables: {
      trips: { Row: Trip; Insert: Omit<Trip, 'id' | 'created_at'>; Update: Partial<Trip> }
      members: { Row: Member; Insert: Omit<Member, 'id' | 'joined_at'>; Update: Partial<Member> }
      availability: { Row: Availability; Insert: Omit<Availability, 'id'>; Update: Partial<Availability> }
      polls: { Row: Poll; Insert: Omit<Poll, 'id' | 'created_at'>; Update: Partial<Poll> }
      votes: { Row: Vote; Insert: Omit<Vote, 'id'>; Update: Partial<Vote> }
      expenses: { Row: Expense; Insert: Omit<Expense, 'id' | 'created_at'>; Update: Partial<Expense> }
      itinerary_items: { Row: ItineraryItem; Insert: Omit<ItineraryItem, 'id' | 'created_at'>; Update: Partial<ItineraryItem> }
      trip_links: { Row: TripLink; Insert: Omit<TripLink, 'id'>; Update: Partial<TripLink> }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client setup and TypeScript types"
```

---

## Task 4: Utility Functions — Availability Ranking

**Files:**
- Create: `lib/utils/availability.ts`
- Create: `lib/utils/availability.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/utils/availability.test.ts`:
```typescript
import { rankDates, getBestDates } from './availability'
import type { Availability } from '../supabase/types'

const makeRow = (member_id: string, date: string, status: 'available' | 'maybe' | 'unavailable'): Availability => ({
  id: `${member_id}-${date}`,
  member_id,
  date,
  status,
})

describe('rankDates', () => {
  it('ranks dates by available count descending', () => {
    const rows: Availability[] = [
      makeRow('m1', '2026-06-01', 'available'),
      makeRow('m2', '2026-06-01', 'available'),
      makeRow('m1', '2026-06-02', 'available'),
      makeRow('m2', '2026-06-02', 'unavailable'),
    ]
    const ranked = rankDates(rows)
    expect(ranked[0].date).toBe('2026-06-01')
    expect(ranked[0].availableCount).toBe(2)
    expect(ranked[1].date).toBe('2026-06-02')
    expect(ranked[1].availableCount).toBe(1)
  })

  it('breaks ties by maybe count', () => {
    const rows: Availability[] = [
      makeRow('m1', '2026-06-01', 'available'),
      makeRow('m2', '2026-06-01', 'maybe'),
      makeRow('m1', '2026-06-02', 'available'),
      makeRow('m2', '2026-06-02', 'unavailable'),
    ]
    const ranked = rankDates(rows)
    // Both have 1 available, but June 1 has 1 maybe
    expect(ranked[0].date).toBe('2026-06-01')
    expect(ranked[0].maybeCount).toBe(1)
  })

  it('returns empty array for no rows', () => {
    expect(rankDates([])).toEqual([])
  })
})

describe('getBestDates', () => {
  it('returns top 2 dates', () => {
    const rows: Availability[] = [
      makeRow('m1', '2026-06-01', 'available'),
      makeRow('m1', '2026-06-02', 'available'),
      makeRow('m1', '2026-06-03', 'available'),
      makeRow('m2', '2026-06-01', 'available'),
    ]
    const best = getBestDates(rows, 3)
    expect(best).toHaveLength(2)
    expect(best[0].date).toBe('2026-06-01')
  })

  it('marks allAvailable when every member is available', () => {
    const rows: Availability[] = [
      makeRow('m1', '2026-06-01', 'available'),
      makeRow('m2', '2026-06-01', 'available'),
    ]
    const best = getBestDates(rows, 2)
    expect(best[0].allAvailable).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/utils/availability.test.ts
```
Expected: FAIL — "Cannot find module './availability'"

- [ ] **Step 3: Implement availability utils**

Create `lib/utils/availability.ts`:
```typescript
import type { Availability } from '../supabase/types'

export interface RankedDate {
  date: string
  availableCount: number
  maybeCount: number
  allAvailable: boolean
}

export function rankDates(rows: Availability[]): RankedDate[] {
  const dateMap = new Map<string, { available: Set<string>; maybe: Set<string>; all: Set<string> }>()

  for (const row of rows) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, { available: new Set(), maybe: new Set(), all: new Set() })
    }
    const entry = dateMap.get(row.date)!
    entry.all.add(row.member_id)
    if (row.status === 'available') entry.available.add(row.member_id)
    if (row.status === 'maybe') entry.maybe.add(row.member_id)
  }

  const ranked: RankedDate[] = Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    availableCount: counts.available.size,
    maybeCount: counts.maybe.size,
    allAvailable: counts.available.size === counts.all.size && counts.all.size > 0,
  }))

  return ranked.sort((a, b) => {
    if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount
    return b.maybeCount - a.maybeCount
  })
}

export function getBestDates(rows: Availability[], memberCount: number): RankedDate[] {
  const ranked = rankDates(rows)
  return ranked.slice(0, 2).map(d => ({
    ...d,
    allAvailable: d.availableCount === memberCount,
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/utils/availability.test.ts
```
Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/utils/
git commit -m "feat: add availability ranking utils with tests"
```

---

## Task 5: Utility Functions — Expense Balances

**Files:**
- Create: `lib/utils/expenses.ts`
- Create: `lib/utils/expenses.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/utils/expenses.test.ts`:
```typescript
import { calculateBalances, minimumTransactions } from './expenses'
import type { Expense } from '../supabase/types'

const makeExpense = (paid_by: string, amount: number, splits: { member_id: string; amount: number }[]): Expense => ({
  id: 'e1',
  trip_id: 't1',
  paid_by,
  description: 'test',
  amount,
  splits,
  created_at: '2026-01-01',
})

describe('calculateBalances', () => {
  it('returns zero net when one person pays and splits evenly among two', () => {
    const expenses: Expense[] = [
      makeExpense('alice', 100, [
        { member_id: 'alice', amount: 50 },
        { member_id: 'bob', amount: 50 },
      ]),
    ]
    const balances = calculateBalances(expenses)
    expect(balances.get('alice')).toBe(50)   // paid 100, owes 50 → net +50
    expect(balances.get('bob')).toBe(-50)    // paid 0, owes 50 → net -50
  })

  it('handles multiple expenses', () => {
    const expenses: Expense[] = [
      makeExpense('alice', 60, [
        { member_id: 'alice', amount: 30 },
        { member_id: 'bob', amount: 30 },
      ]),
      makeExpense('bob', 40, [
        { member_id: 'alice', amount: 20 },
        { member_id: 'bob', amount: 20 },
      ]),
    ]
    const balances = calculateBalances(expenses)
    // alice: paid 60, owes 30+20=50 → net +10
    // bob: paid 40, owes 30+20=50 → net -10
    expect(balances.get('alice')).toBe(10)
    expect(balances.get('bob')).toBe(-10)
  })
})

describe('minimumTransactions', () => {
  it('produces one transaction when one person owes another', () => {
    const balances = new Map([['alice', 50], ['bob', -50]])
    const txns = minimumTransactions(balances)
    expect(txns).toHaveLength(1)
    expect(txns[0]).toEqual({ from: 'bob', to: 'alice', amount: 50 })
  })

  it('produces minimum transactions for three people', () => {
    // alice +30, bob -10, carol -20
    const balances = new Map([['alice', 30], ['bob', -10], ['carol', -20]])
    const txns = minimumTransactions(balances)
    expect(txns).toHaveLength(2)
    const total = txns.reduce((s, t) => s + t.amount, 0)
    expect(total).toBe(30)
  })

  it('returns empty array when all balances are zero', () => {
    const balances = new Map([['alice', 0], ['bob', 0]])
    expect(minimumTransactions(balances)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/utils/expenses.test.ts
```
Expected: FAIL — "Cannot find module './expenses'"

- [ ] **Step 3: Implement expense utils**

Create `lib/utils/expenses.ts`:
```typescript
import type { Expense } from '../supabase/types'

export interface Transaction {
  from: string
  to: string
  amount: number
}

// Returns net balance per member: positive = owed money, negative = owes money
export function calculateBalances(expenses: Expense[]): Map<string, number> {
  const balances = new Map<string, number>()

  const add = (id: string, delta: number) => {
    balances.set(id, (balances.get(id) ?? 0) + delta)
  }

  for (const expense of expenses) {
    add(expense.paid_by, expense.amount)
    for (const split of expense.splits) {
      add(split.member_id, -split.amount)
    }
  }

  return balances
}

// Greedy minimum transactions to settle all debts
export function minimumTransactions(balances: Map<string, number>): Transaction[] {
  const creditors: { id: string; amount: number }[] = []
  const debtors: { id: string; amount: number }[] = []

  for (const [id, amount] of balances) {
    const rounded = Math.round(amount * 100) / 100
    if (rounded > 0) creditors.push({ id, amount: rounded })
    else if (rounded < 0) debtors.push({ id, amount: -rounded })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transactions: Transaction[] = []

  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci]
    const debt = debtors[di]
    const amount = Math.min(credit.amount, debt.amount)
    const rounded = Math.round(amount * 100) / 100

    transactions.push({ from: debt.id, to: credit.id, amount: rounded })

    credit.amount -= amount
    debt.amount -= amount

    if (Math.round(credit.amount * 100) === 0) ci++
    if (Math.round(debt.amount * 100) === 0) di++
  }

  return transactions
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/utils/expenses.test.ts
```
Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/utils/
git commit -m "feat: add expense balance calculation utils with tests"
```

---

## Task 6: useMember Hook (Local Identity)

**Files:**
- Create: `hooks/useMember.ts`

- [ ] **Step 1: Implement useMember hook**

Create `hooks/useMember.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add hooks/
git commit -m "feat: add useMember hook for localStorage identity"
```

---

## Task 7: Landing Page + Trip Creation

**Files:**
- Create: `app/page.tsx`
- Create: `app/api/trips/route.ts`

- [ ] **Step 1: Create trip creation API route**

Create `app/api/trips/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { name, destination } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Trip name is required' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('trips')
    .insert({ name: name.trim(), destination: destination?.trim() || null })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
```

- [ ] **Step 2: Create landing page**

Create `app/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, destination }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to create trip')
      setLoading(false)
      return
    }

    router.push(`/trips/${data.id}/join`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Trip Planner</h1>
        <p className="text-gray-500 text-center mb-8">Plan trips with your group. No sign-up needed.</p>

        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Weekend camping trip"
              className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination (optional)</label>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="Yosemite National Park"
              className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50 active:bg-blue-700"
          >
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify trip creation works**

```bash
npm run dev
```
Open http://localhost:3000, fill in trip name, submit. Expected: redirected to `/trips/[id]/join`.

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: add landing page and trip creation API"
```

---

## Task 8: Join Page

**Files:**
- Create: `app/trips/[id]/join/page.tsx`
- Create: `app/api/trips/[id]/members/route.ts`

- [ ] **Step 1: Create member creation API route**

Create `app/api/trips/[id]/members/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { displayName } = await request.json()

  if (!displayName?.trim()) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()

  // Verify trip exists
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', params.id)
    .single()

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('members')
    .insert({ trip_id: params.id, display_name: displayName.trim() })
    .select('id, display_name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, displayName: data.display_name })
}
```

- [ ] **Step 2: Create join page**

Create `app/trips/[id]/join/page.tsx`:
```tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMemberFromStorage, saveMemberToStorage } from '@/hooks/useMember'

export default function JoinPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const tripId = params.id
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If already joined, skip to trip page
  useEffect(() => {
    const existing = getMemberFromStorage(tripId)
    if (existing) {
      router.replace(`/trips/${tripId}`)
    }
  }, [tripId, router])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to join trip')
      setLoading(false)
      return
    }

    saveMemberToStorage(tripId, { memberId: data.id, displayName: data.displayName })
    router.replace(`/trips/${tripId}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Join the trip</h1>
        <p className="text-gray-500 text-center mb-8">What should we call you?</p>

        <form onSubmit={handleJoin} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Alex"
              autoFocus
              className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50 active:bg-blue-700"
          >
            {loading ? 'Joining...' : "Let's go"}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify join flow works end-to-end**

```bash
npm run dev
```
1. Create a trip on `/` — should redirect to `/trips/[id]/join`
2. Enter a name — should redirect to `/trips/[id]` (will 404 for now, that's fine)
3. Visit `/trips/[id]/join` again — should immediately redirect to `/trips/[id]`

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: add join page with localStorage identity persistence"
```

---

## Task 9: Trip Page Layout + Tab Bar

**Files:**
- Create: `app/trips/[id]/layout.tsx`
- Create: `app/trips/[id]/page.tsx`
- Create: `components/ui/TabBar.tsx`
- Create: `hooks/useTrip.ts`

- [ ] **Step 1: Create useTrip hook**

Create `hooks/useTrip.ts`:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Trip, Member } from '@/lib/supabase/types'

export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function load() {
      const [{ data: tripData }, { data: membersData }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('members').select('*').eq('trip_id', tripId),
      ])
      if (tripData) setTrip(tripData)
      if (membersData) setMembers(membersData)
      setLoading(false)
    }

    load()

    // Real-time: listen for trip updates (e.g. confirmed_date change)
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        (payload) => setTrip(payload.new as Trip)
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members', filter: `trip_id=eq.${tripId}` },
        (payload) => setMembers(prev => [...prev, payload.new as Member])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  return { trip, members, loading }
}
```

- [ ] **Step 2: Create TabBar component**

Create `components/ui/TabBar.tsx`:
```tsx
'use client'

export type Tab = 'details' | 'availability' | 'polls' | 'expenses'

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'details', label: 'Details', icon: '🗺️' },
  { id: 'availability', label: 'When', icon: '📅' },
  { id: 'polls', label: 'Polls', icon: '🗳️' },
  { id: 'expenses', label: 'Expenses', icon: '💰' },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium min-h-[56px] justify-center transition-colors ${
              activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Create trip page layout**

Create `app/trips/[id]/layout.tsx`:
```tsx
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const supabase = getSupabaseServerClient()
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  return <>{children}</>
}
```

- [ ] **Step 4: Create main trip page**

Create `app/trips/[id]/page.tsx`:
```tsx
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTrip } from '@/hooks/useTrip'
import { getMemberFromStorage } from '@/hooks/useMember'
import { TabBar, type Tab } from '@/components/ui/TabBar'

export default function TripPage() {
  const params = useParams<{ id: string }>()
  const tripId = params.id
  const router = useRouter()
  const { trip, members, loading } = useTrip(tripId)
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [member, setMember] = useState<{ memberId: string; displayName: string } | null>(null)

  useEffect(() => {
    const stored = getMemberFromStorage(tripId)
    if (!stored) {
      router.replace(`/trips/${tripId}/join`)
    } else {
      setMember(stored)
    }
  }, [tripId, router])

  if (loading || !trip || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="font-bold text-lg">{trip.name}</h1>
        {trip.destination && <p className="text-sm text-gray-500">{trip.destination}</p>}
      </header>

      <main className="p-4">
        {activeTab === 'details' && (
          <p className="text-gray-500 text-sm">Details tab — coming soon</p>
        )}
        {activeTab === 'availability' && (
          <p className="text-gray-500 text-sm">Availability tab — coming soon</p>
        )}
        {activeTab === 'polls' && (
          <p className="text-gray-500 text-sm">Polls tab — coming soon</p>
        )}
        {activeTab === 'expenses' && (
          <p className="text-gray-500 text-sm">Expenses tab — coming soon</p>
        )}
      </main>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
```

- [ ] **Step 5: Verify full flow works**

```bash
npm run dev
```
1. Create trip → join → arrive at trip page with header and 4 tabs
2. Tap each tab — shows "coming soon" placeholder
3. Revisit join URL — immediately redirects to trip page

- [ ] **Step 6: Commit**

```bash
git add app/ components/ hooks/
git commit -m "feat: add trip page layout with tab bar and member redirect guard"
```

---

## Task 10: Trip Details Tab

**Files:**
- Create: `components/trip/TripHeader.tsx`
- Create: `components/trip/TripNotes.tsx`
- Create: `components/trip/TripLinks.tsx`
- Modify: `app/trips/[id]/page.tsx`

- [ ] **Step 1: Create TripHeader**

Create `components/trip/TripHeader.tsx`:
```tsx
import type { Trip } from '@/lib/supabase/types'
import { format } from 'date-fns'

interface TripHeaderProps {
  trip: Trip
  onSetConfirmedDate?: (date: string | null) => void
}

export function TripHeader({ trip }: TripHeaderProps) {
  return (
    <div className="bg-white rounded-xl border p-4 mb-4">
      <h2 className="text-xl font-bold">{trip.name}</h2>
      {trip.destination && (
        <p className="text-gray-500 text-sm mt-0.5">📍 {trip.destination}</p>
      )}
      {trip.confirmed_date && (
        <div className="mt-2 inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
          <span>✅</span>
          <span>{format(new Date(trip.confirmed_date), 'MMMM d, yyyy')}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create TripNotes**

Create `components/trip/TripNotes.tsx`:
```tsx
'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface TripNotesProps {
  tripId: string
  initialNotes: string | null
}

export function TripNotes({ tripId, initialNotes }: TripNotesProps) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    setSaving(true)
    const supabase = getSupabaseClient()
    await supabase.from('trips').update({ description: notes || null }).eq('id', tripId)
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-gray-700">Notes</h3>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes about the trip…"
        rows={3}
        className="w-full text-sm text-gray-700 resize-none focus:outline-none placeholder-gray-400"
      />
    </div>
  )
}
```

- [ ] **Step 3: Create TripLinks**

Create `components/trip/TripLinks.tsx`:
```tsx
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
      if (data) setLinks(data)
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
    if (data) setLinks(prev => [...prev, data])
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
```

- [ ] **Step 4: Wire up Details tab in trip page**

In `app/trips/[id]/page.tsx`, replace the details placeholder:

Replace:
```tsx
        {activeTab === 'details' && (
          <p className="text-gray-500 text-sm">Details tab — coming soon</p>
        )}
```

With:
```tsx
        {activeTab === 'details' && (
          <>
            <TripHeader trip={trip} />
            <TripNotes tripId={tripId} initialNotes={trip.description} />
            <TripLinks tripId={tripId} memberId={member.memberId} />
          </>
        )}
```

Add imports at the top of `app/trips/[id]/page.tsx`:
```tsx
import { TripHeader } from '@/components/trip/TripHeader'
import { TripNotes } from '@/components/trip/TripNotes'
import { TripLinks } from '@/components/trip/TripLinks'
```

- [ ] **Step 5: Verify Details tab**

```bash
npm run dev
```
Open a trip. Details tab should show trip name, destination, notes textarea, and links section.

- [ ] **Step 6: Commit**

```bash
git add components/ app/
git commit -m "feat: implement Details tab with header, notes, and links"
```

---

## Task 11: Availability Grid

**Files:**
- Create: `hooks/useAvailability.ts`
- Create: `components/availability/AvailabilityCell.tsx`
- Create: `components/availability/AvailabilityGrid.tsx`
- Create: `components/availability/BestDateBanner.tsx`
- Create: `components/availability/DateRangeProposer.tsx`
- Modify: `app/trips/[id]/page.tsx`

- [ ] **Step 1: Create useAvailability hook**

Create `hooks/useAvailability.ts`:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Availability, AvailabilityStatus } from '@/lib/supabase/types'

export function useAvailability(tripId: string) {
  const [rows, setRows] = useState<Availability[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    // Load all availability for this trip via member join
    async function load() {
      const { data } = await supabase
        .from('availability')
        .select('*, members!inner(trip_id)')
        .eq('members.trip_id', tripId)
      if (data) setRows(data as Availability[])

      // Derive date range from existing availability
      if (data && data.length > 0) {
        const dates = data.map(r => r.date).sort()
        setDateRange({ start: dates[0], end: dates[dates.length - 1] })
      }
    }

    load()

    const channel = supabase
      .channel(`availability-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' },
        () => { load() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function upsertAvailability(memberId: string, date: string, status: AvailabilityStatus) {
    const supabase = getSupabaseClient()
    await supabase.from('availability').upsert(
      { member_id: memberId, date, status },
      { onConflict: 'member_id,date' }
    )
  }

  async function expandDateRange(start: string, end: string) {
    // Only expand — never shrink
    const newStart = dateRange ? (start < dateRange.start ? start : dateRange.start) : start
    const newEnd = dateRange ? (end > dateRange.end ? end : dateRange.end) : end
    setDateRange({ start: newStart, end: newEnd })
  }

  return { rows, dateRange, upsertAvailability, expandDateRange }
}
```

- [ ] **Step 2: Create AvailabilityCell**

Create `components/availability/AvailabilityCell.tsx`:
```tsx
import type { AvailabilityStatus } from '@/lib/supabase/types'

interface AvailabilityCellProps {
  status: AvailabilityStatus | null
  isCurrentUser: boolean
  isBestDate: boolean
  onClick: () => void
}

const STATUS_STYLES: Record<AvailabilityStatus, string> = {
  available: 'bg-green-100 text-green-700 border-green-300',
  maybe: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  unavailable: 'bg-gray-100 text-gray-400 border-gray-200',
}

const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available: '✓',
  maybe: '~',
  unavailable: '✕',
}

function nextStatus(current: AvailabilityStatus | null): AvailabilityStatus {
  if (!current || current === 'unavailable') return 'available'
  if (current === 'available') return 'maybe'
  return 'unavailable'
}

export function AvailabilityCell({ status, isCurrentUser, isBestDate, onClick }: AvailabilityCellProps) {
  const displayStatus = status ?? 'unavailable'

  return (
    <button
      onClick={isCurrentUser ? onClick : undefined}
      className={`
        min-w-[44px] min-h-[44px] flex items-center justify-center text-sm font-medium border rounded
        ${STATUS_STYLES[displayStatus]}
        ${isBestDate ? 'ring-2 ring-blue-400' : ''}
        ${isCurrentUser ? 'cursor-pointer active:scale-95' : 'cursor-default'}
        transition-all
      `}
      aria-label={`${displayStatus}${isCurrentUser ? ' — tap to change' : ''}`}
    >
      {STATUS_ICONS[displayStatus]}
    </button>
  )
}
```

- [ ] **Step 3: Create BestDateBanner**

Create `components/availability/BestDateBanner.tsx`:
```tsx
import type { RankedDate } from '@/lib/utils/availability'
import { format } from 'date-fns'

interface BestDateBannerProps {
  bestDates: RankedDate[]
  memberCount: number
  onConfirm: (date: string) => void
}

export function BestDateBanner({ bestDates, memberCount, onConfirm }: BestDateBannerProps) {
  if (bestDates.length === 0 || memberCount === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Best Dates</p>
      {bestDates.map(d => (
        <div key={d.date} className="flex items-center justify-between py-1.5">
          <div>
            <span className="font-semibold text-gray-800">
              {format(new Date(d.date), 'MMM d')}
            </span>
            {d.allAvailable ? (
              <span className="ml-2 text-green-600 text-sm font-medium">🎉 Everyone's free!</span>
            ) : (
              <span className="ml-2 text-gray-500 text-sm">
                {d.availableCount}/{memberCount} available
                {d.maybeCount > 0 && `, ${d.maybeCount} maybe`}
              </span>
            )}
          </div>
          <button
            onClick={() => onConfirm(d.date)}
            className="text-xs font-medium text-blue-600 border border-blue-300 rounded-full px-2.5 py-1 ml-3 active:bg-blue-100"
          >
            Set date
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create DateRangeProposer**

Create `components/availability/DateRangeProposer.tsx`:
```tsx
'use client'
import { useState } from 'react'

interface DateRangeProposerProps {
  onPropose: (start: string, end: string) => void
}

export function DateRangeProposer({ onPropose }: DateRangeProposerProps) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [open, setOpen] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!start || !end || start > end) return
    onPropose(start, end)
    setOpen(false)
    setStart('')
    setEnd('')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600 font-medium mb-3 flex items-center gap-1"
      >
        + Propose dates
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-3 mb-4 space-y-2">
      <p className="text-sm font-medium text-gray-700">Propose a date range</p>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500">To</label>
          <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium">
          Add dates
        </button>
        <button type="button" onClick={() => setOpen(false)} className="flex-1 border rounded-lg py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Create AvailabilityGrid**

Create `components/availability/AvailabilityGrid.tsx`:
```tsx
'use client'
import { useMemo } from 'react'
import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { AvailabilityCell } from './AvailabilityCell'
import { BestDateBanner } from './BestDateBanner'
import { DateRangeProposer } from './DateRangeProposer'
import { getBestDates } from '@/lib/utils/availability'
import type { Member, Availability, AvailabilityStatus } from '@/lib/supabase/types'
import { getSupabaseClient } from '@/lib/supabase/client'

interface AvailabilityGridProps {
  tripId: string
  members: Member[]
  rows: Availability[]
  dateRange: { start: string; end: string } | null
  currentMemberId: string
  onExpandRange: (start: string, end: string) => void
}

export function AvailabilityGrid({
  tripId,
  members,
  rows,
  dateRange,
  currentMemberId,
  onExpandRange,
}: AvailabilityGridProps) {
  const dates = useMemo(() => {
    if (!dateRange) return []
    return eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) })
  }, [dateRange])

  const bestDates = useMemo(() => getBestDates(rows, members.length), [rows, members.length])
  const bestDateSet = useMemo(() => new Set(bestDates.map(d => d.date)), [bestDates])

  // Build lookup: member_id -> date -> status
  const statusMap = useMemo(() => {
    const map = new Map<string, Map<string, AvailabilityStatus>>()
    for (const row of rows) {
      if (!map.has(row.member_id)) map.set(row.member_id, new Map())
      map.get(row.member_id)!.set(row.date, row.status)
    }
    return map
  }, [rows])

  async function handleCellClick(memberId: string, date: string, currentStatus: AvailabilityStatus | null) {
    const next: AvailabilityStatus = !currentStatus || currentStatus === 'unavailable' ? 'available'
      : currentStatus === 'available' ? 'maybe' : 'unavailable'
    const supabase = getSupabaseClient()
    await supabase.from('availability').upsert(
      { member_id: memberId, date, status: next },
      { onConflict: 'member_id,date' }
    )
  }

  async function handleConfirmDate(date: string) {
    const supabase = getSupabaseClient()
    await supabase.from('trips').update({ confirmed_date: date }).eq('id', tripId)
  }

  if (dates.length === 0) {
    return (
      <div>
        <DateRangeProposer onPropose={onExpandRange} />
        <p className="text-sm text-gray-400 text-center py-8">No dates proposed yet</p>
      </div>
    )
  }

  return (
    <div>
      <BestDateBanner bestDates={bestDates} memberCount={members.length} onConfirm={handleConfirmDate} />
      <DateRangeProposer onPropose={onExpandRange} />

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-50 z-10 min-w-[80px] text-left text-xs font-medium text-gray-500 pb-2 pr-3">
                Member
              </th>
              {dates.map(date => {
                const key = format(date, 'yyyy-MM-dd')
                return (
                  <th key={key} className={`text-center pb-2 px-1 ${bestDateSet.has(key) ? 'bg-blue-50' : ''}`}>
                    <div className="text-xs font-medium text-gray-500">{format(date, 'MMM')}</div>
                    <div className="text-sm font-bold text-gray-800">{format(date, 'd')}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id}>
                <td className="sticky left-0 bg-white z-10 text-sm font-medium text-gray-700 pr-3 py-1">
                  {member.display_name}
                  {member.id === currentMemberId && (
                    <span className="text-xs text-blue-500 ml-1">(you)</span>
                  )}
                </td>
                {dates.map(date => {
                  const dateKey = format(date, 'yyyy-MM-dd')
                  const status = statusMap.get(member.id)?.get(dateKey) ?? null
                  return (
                    <td key={dateKey} className={`px-1 py-1 ${bestDateSet.has(dateKey) ? 'bg-blue-50' : ''}`}>
                      <AvailabilityCell
                        status={status}
                        isCurrentUser={member.id === currentMemberId}
                        isBestDate={bestDateSet.has(dateKey)}
                        onClick={() => handleCellClick(member.id, dateKey, status)}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Wire Availability tab into trip page**

In `app/trips/[id]/page.tsx`, add the import and hook at the top, and replace the availability placeholder.

Add import:
```tsx
import { useAvailability } from '@/hooks/useAvailability'
import { AvailabilityGrid } from '@/components/availability/AvailabilityGrid'
```

Add hook call inside the component (after `useTrip`):
```tsx
const { rows: availRows, dateRange, upsertAvailability, expandDateRange } = useAvailability(tripId)
```

Replace:
```tsx
        {activeTab === 'availability' && (
          <p className="text-gray-500 text-sm">Availability tab — coming soon</p>
        )}
```

With:
```tsx
        {activeTab === 'availability' && (
          <AvailabilityGrid
            tripId={tripId}
            members={members}
            rows={availRows}
            dateRange={dateRange}
            currentMemberId={member.memberId}
            onExpandRange={expandDateRange}
          />
        )}
```

- [ ] **Step 7: Verify availability grid**

```bash
npm run dev
```
1. Create trip, join as "Alex", go to When tab
2. Click "Propose dates" — pick a range
3. Grid appears with Alex's row — tap cells to cycle through available/maybe/unavailable
4. Open a second incognito window, join as "Jordan"
5. Grid updates in both windows in real-time
6. Best date banner appears above the grid

- [ ] **Step 8: Commit**

```bash
git add components/ hooks/ app/
git commit -m "feat: implement availability grid with real-time updates and best date banner"
```

---

## Task 12: Polls Tab

**Files:**
- Create: `hooks/usePolls.ts`
- Create: `components/polls/CreatePollForm.tsx`
- Create: `components/polls/PollCard.tsx`
- Create: `components/polls/PollList.tsx`
- Modify: `app/trips/[id]/page.tsx`

- [ ] **Step 1: Create usePolls hook**

Create `hooks/usePolls.ts`:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Poll, Vote } from '@/lib/supabase/types'

export function usePolls(tripId: string) {
  const [polls, setPolls] = useState<Poll[]>([])
  const [votes, setVotes] = useState<Vote[]>([])

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function load() {
      const [{ data: pollData }, { data: voteData }] = await Promise.all([
        supabase.from('polls').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('votes').select('*, polls!inner(trip_id)').eq('polls.trip_id', tripId),
      ])
      if (pollData) setPolls(pollData)
      if (voteData) setVotes(voteData as Vote[])
    }

    load()

    const channel = supabase
      .channel(`polls-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `trip_id=eq.${tripId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function createPoll(question: string, options: string[], createdBy: string) {
    const supabase = getSupabaseClient()
    await supabase.from('polls').insert({
      trip_id: tripId,
      created_by: createdBy,
      question,
      options: options.map((label, i) => ({ id: String(i), label })),
    })
  }

  async function vote(pollId: string, memberId: string, optionId: string) {
    const supabase = getSupabaseClient()
    await supabase.from('votes').upsert(
      { poll_id: pollId, member_id: memberId, option_id: optionId },
      { onConflict: 'poll_id,member_id' }
    )
  }

  async function deletePoll(pollId: string) {
    const supabase = getSupabaseClient()
    await supabase.from('polls').delete().eq('id', pollId)
  }

  return { polls, votes, createPoll, vote, deletePoll }
}
```

- [ ] **Step 2: Create CreatePollForm**

Create `components/polls/CreatePollForm.tsx`:
```tsx
'use client'
import { useState } from 'react'

interface CreatePollFormProps {
  onSubmit: (question: string, options: string[]) => Promise<void>
  onCancel: () => void
}

export function CreatePollForm({ onSubmit, onCancel }: CreatePollFormProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [loading, setLoading] = useState(false)

  function updateOption(i: number, value: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? value : o))
  }

  function addOption() {
    setOptions(prev => [...prev, ''])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validOptions = options.filter(o => o.trim())
    if (!question.trim() || validOptions.length < 2) return
    setLoading(true)
    await onSubmit(question.trim(), validOptions)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
      <h3 className="font-semibold text-gray-800">New Poll</h3>
      <input
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="What are we voting on?"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <div className="space-y-2">
        {options.map((opt, i) => (
          <input
            key={i}
            type="text"
            value={opt}
            onChange={e => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ))}
        <button
          type="button"
          onClick={addOption}
          className="text-sm text-blue-600 font-medium"
        >
          + Add option
        </button>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Create Poll
        </button>
        <button type="button" onClick={onCancel} className="flex-1 border rounded-lg py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create PollCard**

Create `components/polls/PollCard.tsx`:
```tsx
'use client'
import type { Poll, Vote, PollOption } from '@/lib/supabase/types'

interface PollCardProps {
  poll: Poll
  votes: Vote[]
  currentMemberId: string
  onVote: (pollId: string, optionId: string) => void
  onDelete: (pollId: string) => void
}

export function PollCard({ poll, votes, currentMemberId, onVote, onDelete }: PollCardProps) {
  const pollVotes = votes.filter(v => v.poll_id === poll.id)
  const myVote = pollVotes.find(v => v.member_id === currentMemberId)
  const total = pollVotes.length

  const voteCounts = new Map<string, number>()
  for (const v of pollVotes) {
    voteCounts.set(v.option_id, (voteCounts.get(v.option_id) ?? 0) + 1)
  }

  return (
    <div className="bg-white border rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex-1">{poll.question}</h3>
        {poll.created_by === currentMemberId && (
          <button
            onClick={() => onDelete(poll.id)}
            className="text-gray-400 text-sm ml-2 shrink-0"
            aria-label="Delete poll"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-2">
        {(poll.options as PollOption[]).map(option => {
          const count = voteCounts.get(option.id) ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const isMyVote = myVote?.option_id === option.id

          return (
            <button
              key={option.id}
              onClick={() => onVote(poll.id, option.id)}
              className={`w-full text-left rounded-lg border-2 overflow-hidden transition-colors ${
                isMyVote ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <div className="relative px-3 py-2.5">
                {myVote && (
                  <div
                    className={`absolute inset-0 ${isMyVote ? 'bg-blue-50' : 'bg-gray-50'}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <span className={`text-sm font-medium ${isMyVote ? 'text-blue-700' : 'text-gray-700'}`}>
                    {option.label}
                    {isMyVote && <span className="ml-1.5">✓</span>}
                  </span>
                  {myVote && (
                    <span className="text-xs text-gray-500">{pct}%</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {total > 0 && (
        <p className="text-xs text-gray-400 mt-2">{total} vote{total !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create PollList**

Create `components/polls/PollList.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { PollCard } from './PollCard'
import { CreatePollForm } from './CreatePollForm'
import type { Poll, Vote } from '@/lib/supabase/types'

interface PollListProps {
  polls: Poll[]
  votes: Vote[]
  currentMemberId: string
  onVote: (pollId: string, optionId: string) => void
  onDelete: (pollId: string) => void
  onCreatePoll: (question: string, options: string[]) => Promise<void>
}

export function PollList({ polls, votes, currentMemberId, onVote, onDelete, onCreatePoll }: PollListProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 font-medium mb-4 active:bg-gray-50"
        >
          + Create a poll
        </button>
      )}

      {showForm && (
        <CreatePollForm
          onSubmit={async (q, opts) => { await onCreatePoll(q, opts); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {polls.length === 0 && !showForm && (
        <p className="text-center text-gray-400 text-sm py-8">No polls yet</p>
      )}

      {polls.map(poll => (
        <PollCard
          key={poll.id}
          poll={poll}
          votes={votes}
          currentMemberId={currentMemberId}
          onVote={onVote}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Wire Polls tab into trip page**

In `app/trips/[id]/page.tsx`, add imports and hook:
```tsx
import { usePolls } from '@/hooks/usePolls'
import { PollList } from '@/components/polls/PollList'
```

Add hook call:
```tsx
const { polls, votes, createPoll, vote, deletePoll } = usePolls(tripId)
```

Replace polls placeholder:
```tsx
        {activeTab === 'polls' && (
          <PollList
            polls={polls}
            votes={votes}
            currentMemberId={member.memberId}
            onVote={(pollId, optionId) => vote(pollId, member.memberId, optionId)}
            onDelete={deletePoll}
            onCreatePoll={(q, opts) => createPoll(q, opts, member.memberId)}
          />
        )}
```

- [ ] **Step 6: Verify polls**

```bash
npm run dev
```
1. Go to Polls tab → create a poll with 3 options
2. Vote on an option — bar chart appears, your choice has checkmark
3. Open incognito window, vote differently — counts update in real-time
4. Creator can delete the poll

- [ ] **Step 7: Commit**

```bash
git add components/ hooks/ app/
git commit -m "feat: implement polls tab with real-time voting"
```

---

## Task 13: Expenses Tab

**Files:**
- Create: `hooks/useExpenses.ts`
- Create: `components/expenses/BalancesSummary.tsx`
- Create: `components/expenses/ExpenseList.tsx`
- Create: `components/expenses/AddExpenseSheet.tsx`
- Create: `components/ui/BottomSheet.tsx`
- Modify: `app/trips/[id]/page.tsx`

- [ ] **Step 1: Create BottomSheet UI component**

Create `components/ui/BottomSheet.tsx`:
```tsx
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-500 text-lg leading-none p-1">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create useExpenses hook**

Create `hooks/useExpenses.ts`:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Expense, ExpenseSplit } from '@/lib/supabase/types'

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function load() {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
      if (data) setExpenses(data)
    }

    load()

    const channel = supabase
      .channel(`expenses-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function addExpense(params: {
    paidBy: string
    description: string
    amount: number
    splits: ExpenseSplit[]
  }) {
    const supabase = getSupabaseClient()
    await supabase.from('expenses').insert({
      trip_id: tripId,
      paid_by: params.paidBy,
      description: params.description,
      amount: params.amount,
      splits: params.splits,
    })
  }

  return { expenses, addExpense }
}
```

- [ ] **Step 3: Create BalancesSummary**

Create `components/expenses/BalancesSummary.tsx`:
```tsx
import { calculateBalances, minimumTransactions } from '@/lib/utils/expenses'
import type { Expense, Member } from '@/lib/supabase/types'

interface BalancesSummaryProps {
  expenses: Expense[]
  members: Member[]
  currentMemberId: string
}

export function BalancesSummary({ expenses, members, currentMemberId }: BalancesSummaryProps) {
  const memberMap = new Map(members.map(m => [m.id, m.display_name]))
  const balances = calculateBalances(expenses)
  const transactions = minimumTransactions(balances)

  if (expenses.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-1">Balances</h3>
        <p className="text-sm text-gray-400">No expenses yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-4 mb-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">Balances</h3>

      {transactions.length === 0 ? (
        <p className="text-sm text-green-600 font-medium">✅ All settled up!</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((t, i) => {
            const fromName = memberMap.get(t.from) ?? 'Unknown'
            const toName = memberMap.get(t.to) ?? 'Unknown'
            const isMe = t.from === currentMemberId || t.to === currentMemberId
            return (
              <li key={i} className={`text-sm ${isMe ? 'font-semibold' : 'text-gray-600'}`}>
                <span className={t.from === currentMemberId ? 'text-red-600' : ''}>
                  {fromName}
                </span>
                {' owes '}
                <span className={t.to === currentMemberId ? 'text-green-600' : ''}>
                  {toName}
                </span>
                {' '}
                <span className="font-bold">${t.amount.toFixed(2)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create ExpenseList**

Create `components/expenses/ExpenseList.tsx`:
```tsx
import type { Expense, Member } from '@/lib/supabase/types'
import { format } from 'date-fns'

interface ExpenseListProps {
  expenses: Expense[]
  members: Member[]
}

export function ExpenseList({ expenses, members }: ExpenseListProps) {
  const memberMap = new Map(members.map(m => [m.id, m.display_name]))

  if (expenses.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-gray-700">All Expenses</h3>
      {expenses.map(expense => (
        <div key={expense.id} className="bg-white border rounded-xl p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-800 text-sm">{expense.description}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Paid by {memberMap.get(expense.paid_by) ?? 'Unknown'} · {format(new Date(expense.created_at), 'MMM d')}
              </p>
            </div>
            <span className="font-bold text-gray-900 text-sm">${Number(expense.amount).toFixed(2)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(expense.splits as { member_id: string; amount: number }[]).map(split => (
              <span key={split.member_id} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">
                {memberMap.get(split.member_id) ?? 'Unknown'}: ${Number(split.amount).toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create AddExpenseSheet**

Create `components/expenses/AddExpenseSheet.tsx`:
```tsx
'use client'
import { useState } from 'react'
import type { Member, ExpenseSplit } from '@/lib/supabase/types'

interface AddExpenseSheetProps {
  members: Member[]
  currentMemberId: string
  onSubmit: (params: { paidBy: string; description: string; amount: number; splits: ExpenseSplit[] }) => Promise<void>
  onClose: () => void
}

export function AddExpenseSheet({ members, currentMemberId, onSubmit, onClose }: AddExpenseSheetProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentMemberId)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(members.map(m => m.id)))
  const [customSplits, setCustomSplits] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalAmount = parseFloat(amount) || 0
  const splitMembers = members.filter(m => selectedMembers.has(m.id))
  const equalShare = splitMembers.length > 0 ? totalAmount / splitMembers.length : 0

  function toggleMember(id: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setCustomSplits(new Map()) // reset custom splits on member toggle
  }

  function setCustomAmount(memberId: string, value: string) {
    setCustomSplits(prev => new Map(prev).set(memberId, value))
  }

  function buildSplits(): ExpenseSplit[] | null {
    if (splitMembers.length === 0) return null
    if (customSplits.size === 0) {
      // Equal split
      return splitMembers.map(m => ({ member_id: m.id, amount: Math.round(equalShare * 100) / 100 }))
    }
    // Custom splits — must sum to total
    const splits = splitMembers.map(m => {
      const custom = customSplits.get(m.id)
      return { member_id: m.id, amount: custom ? parseFloat(custom) : 0 }
    })
    const sum = splits.reduce((s, x) => s + x.amount, 0)
    if (Math.abs(sum - totalAmount) > 0.01) return null
    return splits
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || totalAmount <= 0) return
    const splits = buildSplits()
    if (!splits) {
      setError('Split amounts must add up to the total')
      return
    }
    setLoading(true)
    await onSubmit({ paidBy, description: description.trim(), amount: totalAmount, splits })
    setLoading(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Airbnb, groceries, gas…"
          className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
        <select
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.display_name}{m.id === currentMemberId ? ' (you)' : ''}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Split between</label>
        <div className="space-y-2">
          {members.map(m => {
            const selected = selectedMembers.has(m.id)
            const customVal = customSplits.get(m.id) ?? ''
            return (
              <div key={m.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleMember(m.id)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm flex-1">{m.display_name}{m.id === currentMemberId ? ' (you)' : ''}</span>
                {selected && totalAmount > 0 && (
                  <input
                    type="number"
                    value={customVal || equalShare.toFixed(2)}
                    onChange={e => setCustomAmount(m.id, e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-20 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add Expense'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Wire Expenses tab into trip page**

In `app/trips/[id]/page.tsx`, add imports and hook:
```tsx
import { useExpenses } from '@/hooks/useExpenses'
import { BalancesSummary } from '@/components/expenses/BalancesSummary'
import { ExpenseList } from '@/components/expenses/ExpenseList'
import { AddExpenseSheet } from '@/components/expenses/AddExpenseSheet'
import { BottomSheet } from '@/components/ui/BottomSheet'
```

Add hook call and state:
```tsx
const { expenses, addExpense } = useExpenses(tripId)
const [showAddExpense, setShowAddExpense] = useState(false)
```

Replace expenses placeholder:
```tsx
        {activeTab === 'expenses' && (
          <>
            <BalancesSummary expenses={expenses} members={members} currentMemberId={member.memberId} />
            <button
              onClick={() => setShowAddExpense(true)}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm mb-4 active:bg-blue-700"
            >
              + Add Expense
            </button>
            <ExpenseList expenses={expenses} members={members} />
            <BottomSheet open={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add Expense">
              <AddExpenseSheet
                members={members}
                currentMemberId={member.memberId}
                onSubmit={addExpense}
                onClose={() => setShowAddExpense(false)}
              />
            </BottomSheet>
          </>
        )}
```

- [ ] **Step 7: Verify expenses**

```bash
npm run dev
```
1. Add an expense — split equally between all members
2. Override one member's share to a custom amount
3. Submit — expense appears in log, balances update
4. Add a second expense paid by a different person
5. Balances show minimum transactions to settle up

- [ ] **Step 8: Commit**

```bash
git add components/ hooks/ app/
git commit -m "feat: implement expenses tab with flexible splits and balance summary"
```

---

## Task 14: Itinerary

**Files:**
- Create: `components/itinerary/AddItineraryForm.tsx`
- Create: `components/itinerary/ItineraryList.tsx`
- Modify: `app/trips/[id]/page.tsx`

- [ ] **Step 1: Create AddItineraryForm**

Create `components/itinerary/AddItineraryForm.tsx`:
```tsx
'use client'
import { useState } from 'react'

interface AddItineraryFormProps {
  onSubmit: (item: { day: string | null; time: string | null; activity: string }) => Promise<void>
}

export function AddItineraryForm({ onSubmit }: AddItineraryFormProps) {
  const [activity, setActivity] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activity.trim()) return
    setLoading(true)
    await onSubmit({ activity: activity.trim(), day: day || null, time: time || null })
    setActivity('')
    setDay('')
    setTime('')
    setOpen(false)
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 font-medium mb-4 active:bg-gray-50"
      >
        + Add itinerary item
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
      <input
        type="text"
        value={activity}
        onChange={e => setActivity(e.target.value)}
        placeholder="Activity or note"
        autoFocus
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={day}
          onChange={e => setDay(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !activity.trim()}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className="flex-1 border rounded-lg py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create ItineraryList with drag-to-reorder**

Create `components/itinerary/ItineraryList.tsx`:
```tsx
'use client'
import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { ItineraryItem } from '@/lib/supabase/types'
import { AddItineraryForm } from './AddItineraryForm'

interface SortableItemProps {
  item: ItineraryItem
}

function SortableItem({ item }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="bg-white border rounded-xl p-3 flex items-start gap-3 mb-2">
      <button {...attributes} {...listeners} className="text-gray-300 mt-0.5 cursor-grab active:cursor-grabbing touch-none">
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{item.activity}</p>
        {(item.day || item.time) && (
          <p className="text-xs text-gray-400 mt-0.5">
            {item.day && format(new Date(item.day), 'MMM d')}
            {item.day && item.time && ' · '}
            {item.time && item.time.slice(0, 5)}
          </p>
        )}
      </div>
    </div>
  )
}

interface ItineraryListProps {
  tripId: string
}

export function ItineraryList({ tripId }: ItineraryListProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order')
      .then(({ data }) => { if (data) setItems(data) })
  }, [tripId])

  async function handleAdd(item: { day: string | null; time: string | null; activity: string }) {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('itinerary_items')
      .insert({ trip_id: tripId, ...item, sort_order: items.length })
      .select()
      .single()
    if (data) setItems(prev => [...prev, data])
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)

    // Persist new order
    const supabase = getSupabaseClient()
    await Promise.all(
      reordered.map((item, idx) =>
        supabase.from('itinerary_items').update({ sort_order: idx }).eq('id', item.id)
      )
    )
  }

  return (
    <div>
      <AddItineraryForm onSubmit={handleAdd} />

      {items.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">No itinerary items yet</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => <SortableItem key={item.id} item={item} />)}
        </SortableContext>
      </DndContext>
    </div>
  )
}
```

- [ ] **Step 3: Wire ItineraryList into Details tab**

In `app/trips/[id]/page.tsx`, add import:
```tsx
import { ItineraryList } from '@/components/itinerary/ItineraryList'
```

In the details tab section, add `<ItineraryList tripId={tripId} />` after `<TripLinks>`:
```tsx
        {activeTab === 'details' && (
          <>
            <TripHeader trip={trip} />
            <TripNotes tripId={tripId} initialNotes={trip.description} />
            <TripLinks tripId={tripId} memberId={member.memberId} />
            <div className="mt-2">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Itinerary</h3>
              <ItineraryList tripId={tripId} />
            </div>
          </>
        )}
```

- [ ] **Step 4: Verify itinerary**

```bash
npm run dev
```
1. Go to Details tab — add several itinerary items with dates and times
2. Drag items to reorder — order persists on page reload
3. Items without dates display cleanly

- [ ] **Step 5: Commit**

```bash
git add components/ app/
git commit -m "feat: implement drag-reorderable itinerary on details tab"
```

---

## Task 15: Share Button + Final Polish

**Files:**
- Modify: `app/trips/[id]/page.tsx`

- [ ] **Step 1: Add share button to trip header**

In `app/trips/[id]/page.tsx`, replace the header section:

Replace:
```tsx
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="font-bold text-lg">{trip.name}</h1>
        {trip.destination && <p className="text-sm text-gray-500">{trip.destination}</p>}
      </header>
```

With:
```tsx
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{trip.name}</h1>
            {trip.destination && <p className="text-sm text-gray-500">{trip.destination}</p>}
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/trips/${tripId}/join`
              if (navigator.share) {
                navigator.share({ title: trip.name, url })
              } else {
                navigator.clipboard.writeText(url)
                alert('Invite link copied!')
              }
            }}
            className="text-blue-600 text-sm font-medium border border-blue-200 rounded-full px-3 py-1.5 active:bg-blue-50"
          >
            Share
          </button>
        </div>
      </header>
```

- [ ] **Step 2: Verify share button**

```bash
npm run dev
```
On desktop: clicking Share copies the join URL to clipboard.
On mobile: taps into native share sheet.

- [ ] **Step 3: Final build check**

```bash
npm run build
```
Expected: Build completes with no errors. Fix any TypeScript errors that appear.

- [ ] **Step 4: Final commit**

```bash
git add app/
git commit -m "feat: add share button with native share sheet and clipboard fallback"
```

---

## Task 16: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/<your-username>/trip-planner.git
git push -u origin main
```

- [ ] **Step 2: Deploy on Vercel**

1. Go to https://vercel.com → New Project → Import your GitHub repo
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — from your Supabase project settings
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project settings
3. Deploy

- [ ] **Step 3: Smoke test on mobile**

1. Open deployed URL on your phone
2. Create a trip, share link via native share sheet
3. Open link on another phone, join with a different name
4. Fill in availability — confirm it updates on both phones in real time
5. Create a poll, vote, confirm real-time updates
6. Add an expense, verify balances

- [ ] **Step 4: Enable Supabase real-time for all tables**

In Supabase dashboard → Database → Replication, enable realtime for:
`availability`, `trips`, `members`, `polls`, `votes`, `expenses`, `itinerary_items`

---

## Self-Review Notes

**Spec coverage check:**
- ✅ No-account link-based joining
- ✅ Availability grid with tap/drag cells
- ✅ Best date banner pinned above grid
- ✅ Highlighted best-date column
- ✅ "Everyone's free!" callout
- ✅ Any member can confirm a date
- ✅ Date range expansion (not shrinking)
- ✅ Real-time updates across all features
- ✅ Polls with bar chart results
- ✅ Expense flexible splits with custom amounts
- ✅ Minimum-transactions balance settlement
- ✅ Trip details: header, notes, links, itinerary
- ✅ Drag-reorderable itinerary
- ✅ Mobile-first (44px tap targets, bottom sheet, sticky columns)
- ✅ Share button with native share sheet
