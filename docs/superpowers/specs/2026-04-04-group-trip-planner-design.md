# Group Trip Planner — Design Spec

**Date:** 2026-04-04  
**Status:** Approved

---

## Overview

A mobile-first website that helps groups plan trips together. Anyone can create a trip, share an invite link, and the whole group collaborates — no accounts required. The app solves the core problem of coordinating when everyone is free, then adds polls, expense splitting, and itinerary planning to cover the full trip planning lifecycle.

---

## Tech Stack

- **Frontend/Backend:** Next.js (App Router) deployed on Vercel
- **Database + Real-time:** Supabase (Postgres + real-time subscriptions)
- **Identity:** Anonymous, link-based. `member_id` stored in localStorage per trip.
- **Styling:** TBD (Tailwind recommended for mobile-first)

---

## Architecture

### Page Structure

| Route | Purpose |
|---|---|
| `/` | Landing page with "Create a trip" CTA |
| `/trips/[id]` | Main trip page (tabbed: Details, Availability, Polls, Expenses) |
| `/trips/[id]/join` | Enter display name, join trip, redirect to trip page |

### Data Model

```sql
trips
  id          UUID PRIMARY KEY
  name        TEXT
  destination TEXT
  description TEXT
  confirmed_date DATE
  created_at  TIMESTAMPTZ

members
  id          UUID PRIMARY KEY
  trip_id     UUID REFERENCES trips
  display_name TEXT
  joined_at   TIMESTAMPTZ

availability
  id          UUID PRIMARY KEY
  member_id   UUID REFERENCES members
  date        DATE
  status      TEXT CHECK (status IN ('available', 'maybe', 'unavailable'))

polls
  id          UUID PRIMARY KEY
  trip_id     UUID REFERENCES trips
  created_by  UUID REFERENCES members
  question    TEXT
  options     JSONB  -- array of {id, label}
  created_at  TIMESTAMPTZ

votes
  id          UUID PRIMARY KEY
  poll_id     UUID REFERENCES polls
  member_id   UUID REFERENCES members
  option_id   TEXT
  UNIQUE(poll_id, member_id)

expenses
  id          UUID PRIMARY KEY
  trip_id     UUID REFERENCES trips
  paid_by     UUID REFERENCES members
  description TEXT
  amount      NUMERIC(10,2)
  splits      JSONB  -- array of {member_id, amount}
  created_at  TIMESTAMPTZ

itinerary_items
  id          UUID PRIMARY KEY
  trip_id     UUID REFERENCES trips
  day         DATE
  time        TIME
  activity    TEXT
  sort_order  INTEGER
  created_at  TIMESTAMPTZ

trip_links
  id          UUID PRIMARY KEY
  trip_id     UUID REFERENCES trips
  label       TEXT
  url         TEXT
  added_by    UUID REFERENCES members
```

---

## Feature Designs

### 1. Joining a Trip

- Trip creator shares the `/trips/[id]` URL (e.g. via group chat)
- New visitors are redirected to `/trips/[id]/join` to enter a display name
- On submit, a `member` row is created and the `member_id` is stored in localStorage
- Returning visitors are recognized by localStorage and skip the join step

---

### 2. Availability Grid

**Purpose:** Find the best date(s) for the trip based on everyone's availability.

**Interaction:**
- Any member can propose a date range (drag a window on a mini-calendar)
- Grid renders dates as columns, members as rows
- Members tap/drag cells to set their status: available (green ✓), maybe (yellow ~), unavailable (grey ✕)
- Uses both color and icons for color-blind accessibility
- Cells have minimum 44px tap targets for mobile
- Dates column is horizontally scrollable; member name column is sticky on the left
- Other members' updates appear in real-time via Supabase subscriptions

**Best Date Display:**
- A **"Best Date" banner** is pinned above the grid — shows the top 1–2 dates ranked by available count (e.g. "June 7 — 5/6 available")
- Ties broken by "maybe" count
- The best-date column is visually highlighted in the grid (distinct border + background tint)
- If all members are available on a date: "Everyone's free!" callout
- Any member can tap a best date to set it as the confirmed trip date

---

### 3. Polls & Voting

**Purpose:** Democratic decision-making on destination, activities, accommodation, etc.

**Structure:**
- Any member can create a poll with a question and 2+ options
- One vote per member per poll
- Results shown as a bar chart with percentages, visible to all in real-time
- Poll creator can delete their own poll; anyone can create
- Lives in the **Polls tab**

**Mobile UX:**
- Compact card layout: question at top, options as tappable buttons
- Results expand in-place after voting

---

### 4. Expense Splitting

**Purpose:** Track shared costs and show who owes who without requiring payment integration.

**Structure:**
- Any member can log an expense: description, amount, who paid, who's splitting it
- Default split: equal among selected members
- Any member's share can be overridden to a custom amount (remaining amount auto-distributes)
- **Balances summary** pinned at top of Expenses tab: net per person ("Alex owes $23.50")
- Balances use minimum-transactions algorithm across all expenses
- No payment integrations — settlement is offline

**Mobile UX:**
- "Add Expense" opens a bottom sheet form
- Expense log below balances, newest first

---

### 5. Trip Details & Itinerary

**Purpose:** Shared space for trip info, planning notes, and day-by-day schedule.

**Structure:**
- **Header:** Trip name, destination, confirmed date (from availability or manually set)
- **Notes:** Free-text field, editable by any member (last-write-wins)
- **Itinerary:** Ordered list of items — day, time, activity. Any member can add, edit, reorder
- **Links:** Members can add labeled links (Airbnb, trails, restaurants, etc.)
- This is the **first tab** users land on after joining

**Mobile UX:**
- Card-based layout
- Itinerary items are drag-reorderable

---

## Member Identity

- No user accounts
- `member_id` (UUID) stored in localStorage keyed by trip ID
- Display name is set once on join; not editable after (acceptable limitation for v1)
- If localStorage is cleared, the member can rejoin with the same link under a new name

---

## Error Handling & Edge Cases

- Duplicate join: if `member_id` exists in localStorage for this trip, skip join screen
- Expense splits must sum to total amount — validated client-side before submit
- Poll options: minimum 2, no hard maximum
- Date range: any member can extend the availability window; existing availability is preserved
- Confirmed date: stored on the trip record, displayed prominently in the header

---

## Out of Scope (v1)

- User accounts or authentication
- Push/email notifications
- Payment integrations (Venmo, PayPal)
- Chat or comments
- Trip templates
- Member removal or trip deletion by an "admin"

---

## Success Criteria

- A group can create a trip, share a link, and all fill in availability within 2 minutes
- Best date is immediately visible without any explanation needed
- Expenses balance correctly across flexible splits
- Works smoothly on mobile Safari and Chrome
