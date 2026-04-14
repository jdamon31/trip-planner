# Tripkit

Group trip planning web app. No sign-up required — share a link, everyone joins and collaborates instantly.

Live: **https://trip-planner-chi-wine.vercel.app**

---

## Features

| Tab | What it does |
|-----|-------------|
| **Details** | Trip name, destination, photo, notes, links, member list. Creator can edit name/destination, leave, or delete the trip. Confirmed dates shown as a range (e.g. Apr 17–19, 2025). |
| **When** | Propose date ranges via an inline tap-calendar (swipe to change month). Vote ✓ In / ~ Partial / ✗ Can't on each range. Partial votes support a caveat note. Best-scoring range gets a ✨ badge. Creator sets official trip dates; changing already-set dates shows a confirmation prompt. |
| **Itinerary** | Day-by-day activity list. Add/edit/delete/reorder activities. Each activity has a title, optional time (12h scroll picker), description, and location. Activities can be moved between days without losing other field edits. |
| **Polls** | Create yes/no or multi-option polls with optional multi-select. Real-time vote counts. |
| **Expenses** | Log shared expenses with custom splits. Balance summary shows who owes whom. |
| **Chat** | Real-time group chat. Unread badge on the tab; clears when the tab is opened. |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres + real-time subscriptions) |
| Auth | Supabase Auth — Google sign-in (optional; app works anonymously) |
| Hosting | Vercel |
| Date utils | date-fns v4 |
| Drag & drop | @dnd-kit (itinerary reorder) |

---

## Project Structure

```
app/
  page.tsx                  # Home — lists all trips for the current user
  layout.tsx                # Root layout, AuthProvider, PWA metadata
  manifest.ts               # PWA manifest (installable on iPhone/Android)
  icon.tsx                  # Generated app icon
  auth/callback/            # Supabase OAuth callback route
  trips/
    [id]/page.tsx           # Main trip page (all tabs)
    [id]/join/page.tsx      # Join flow — enter display name

  api/trips/
    route.ts                # POST — create trip
    [id]/route.ts           # GET, PATCH, DELETE
    [id]/members/route.ts   # POST — join trip (enforces 150-member cap)
    [id]/members/[memberId]/route.ts  # DELETE — leave trip

components/
  availability/
    DateRangeProposer.tsx   # Inline tap-calendar with swipe month nav
    RangeCard.tsx           # Single range vote card (voting, confirm/unconfirm, dialogs)
    RangeVotingView.tsx     # When tab — RangeCard list + trip dates banner + best match
  auth/
    SignInButtons.tsx        # Google sign-in button
  chat/
    ChatView.tsx            # Message list + input
    MessageBubble.tsx
  expenses/
    AddExpenseSheet.tsx
    BalancesSummary.tsx
    ExpenseList.tsx
  itinerary/
    ActivityCard.tsx        # Single activity (12h time display)
    ActivityFormSheet.tsx   # Add/edit form — time picker, day selector
    DaySection.tsx
    ItineraryList.tsx
  polls/
    PollList.tsx
    PollCard.tsx
    CreatePollSheet.tsx
  trip/
    TripHeader.tsx          # Name, destination, confirmed-dates range badge, edit sheet
    TripMenu.tsx            # ⋯ options: edit, leave, delete
    TripNotes.tsx
    TripLinks.tsx
    TripPhoto.tsx
  ui/
    BottomSheet.tsx         # Shared slide-up modal
    TabBar.tsx              # Bottom tab bar with unread badge support
    Skeleton.tsx

hooks/
  useTrip.ts               # Trip + members, real-time subscription
  useRangeVotes.ts         # Range votes CRUD + real-time
  useMessages.ts           # Chat messages, lastSeen tracking, unreadCount, markRead
  usePolls.ts              # Polls + votes CRUD
  useExpenses.ts           # Expenses CRUD
  useItinerary.ts          # Itinerary items CRUD + drag-reorder
  useMember.ts             # localStorage member identity helpers

contexts/
  AuthContext.tsx           # Supabase session + user object

lib/supabase/
  client.ts                # Singleton Supabase client
  types.ts                 # All TypeScript types + Database schema type

supabase/migrations/
  001_initial_schema.sql   # Base tables
  002_auth_and_features.sql # Auth columns, multi-select polls, date_ranges
```

---

## Data Model

### `trips`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `destination` | text | nullable |
| `description` | text | nullable — trip notes |
| `photo_url` | text | nullable |
| `date_ranges` | jsonb | `[{start, end}]` — proposed date ranges |
| `confirmed_dates` | text[] | sorted `YYYY-MM-DD` strings for the confirmed range |
| `itinerary_days` | int | number of days in the itinerary |
| `created_by_user_id` | text | nullable — Supabase auth user ID |
| `created_at` | timestamptz | |

### `members`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips | |
| `display_name` | text | |
| `user_id` | text | nullable — links to auth user |
| `joined_at` | timestamptz | |

### `range_votes`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips | |
| `range_start` | text | `YYYY-MM-DD` |
| `range_end` | text | `YYYY-MM-DD` |
| `member_id` | uuid FK → members | |
| `status` | text | `'yes' \| 'partial' \| 'no'` |
| `caveat` | text | nullable — note for partial votes |
| Unique | `(trip_id, range_start, range_end, member_id)` | upsert key |

### `itinerary_items`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips | |
| `day_number` | int | 1-based |
| `time` | time | nullable — stored 24h `HH:MM`, displayed 12h |
| `activity` | text | |
| `description` | text | nullable |
| `location` | text | nullable |
| `added_by` | text | nullable — display name |
| `sort_order` | int | drag-to-reorder position |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips | |
| `member_id` | uuid FK → members | |
| `display_name` | text | denormalised for display |
| `content` | text | |
| `created_at` | timestamptz | |

### `polls` / `votes`
Polls store `options` as jsonb `[{id, label}]`. Votes reference `option_id`. Multi-select polls allow multiple `(poll_id, member_id, option_id)` rows.

### `expenses`
`splits` stored as jsonb `[{member_id, amount}]`. Balances computed client-side from the splits array.

---

## Limits (scaling guards)

| Resource | Cap | Enforced in |
|----------|-----|-------------|
| Members per trip | 150 | API route (POST members) |
| Expenses per trip | 500 | `useExpenses` hook |
| Polls per trip | 50 | `usePolls` hook |
| Itinerary items per trip | 200 | `useItinerary` hook |
| Chat messages | Auto-pruned above 10,000 | DB trigger |

---

## Identity Model

- **Anonymous**: display name entered on join, stored in localStorage as `trip_member_<tripId>`. No account needed.
- **Authenticated**: Google sign-in via Supabase Auth. Member row linked via `user_id`. Revisiting a trip URL restores the existing member record automatically.
- Creator privileges (edit trip, set dates, delete) require `trip.created_by_user_id === user.id` — authenticated users only.

---

## Real-time

Every hook subscribes to Supabase `postgres_changes` filtered by `trip_id`. A `visibilitychange` listener re-fetches data when the browser tab regains focus after ≥30 s away.

---

## Running Locally

```bash
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run migrations in the Supabase SQL editor, in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_auth_and_features.sql`

```bash
npm run dev   # http://localhost:3000
```

---

## Deploying

```bash
npx vercel deploy --prod
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project environment variables.

---

## PWA

Installable as a home screen app. On iPhone: Safari → Share → Add to Home Screen. Theme color `#6B8E23` (olive), background `#FAF8EF`.
