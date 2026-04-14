# Auth & New Features — Design Spec

**Date:** 2026-04-05  
**Status:** Approved

---

## Overview

Adds Google + Apple OAuth sign-in, trip photos, a "My trips" dashboard, leave/delete trip, delete dates from the availability grid, multi-select polls, and a "Create new trip" link. Anonymous participation is preserved — accounts are optional.

---

## Tech Stack (additions)

- **Auth:** Supabase Auth (Google + Apple OAuth via Supabase providers)
- **Storage:** Supabase Storage (`trip-photos` bucket, public read)
- **No passwords** — OAuth only

---

## Schema Changes

```sql
-- trips: track creator and photo
ALTER TABLE trips ADD COLUMN created_by_user_id TEXT;
ALTER TABLE trips ADD COLUMN photo_url TEXT;

-- members: link to auth user (nullable — anonymous members have no user_id)
ALTER TABLE members ADD COLUMN user_id TEXT;
ALTER TABLE members ADD CONSTRAINT members_trip_user_unique UNIQUE (trip_id, user_id);

-- polls: allow multiple selections
ALTER TABLE polls ADD COLUMN allow_multiple BOOLEAN NOT NULL DEFAULT false;

-- votes: allow multiple rows per member per poll (for multi-select)
-- Drop old unique constraint, add new one that includes option_id
ALTER TABLE votes DROP CONSTRAINT votes_poll_id_member_id_key;
ALTER TABLE votes ADD CONSTRAINT votes_poll_member_option_unique UNIQUE (poll_id, member_id, option_id);
```

---

## Features

### 1. Authentication

**Provider:** Supabase Auth with Google and Apple OAuth. No passwords, no email/magic-link.

**Session handling:**
- Auth state managed via `supabase.auth.getSession()` / `onAuthStateChange`
- `AuthProvider` React context wraps the app, exposes `user` (nullable)
- Server components use the server Supabase client to read session from cookies

**Sign-in UI:**
- Minimal modal or dedicated `/auth/signin` page
- "Sign in with Google" button
- "Sign in with Apple" button
- Available from the landing page header and the join page

**Sign-out:** Available from the landing page header when signed in.

---

### 2. Updated Join Flow

When a visitor hits `/trips/[id]`:

1. **Already a member via localStorage** → skip to trip page (no change)
2. **Signed in + already a member via `user_id`** → refresh localStorage, skip to trip page
3. **Otherwise** → redirect to `/trips/[id]/join`

Join page — two screens in sequence:

**Screen 1 (shown only if not signed in):**
- "Sign in to join" heading
- "Sign in with Google" button
- "Sign in with Apple" button
- "Continue without signing in" text link below (skips to Screen 2, anonymous path)

**Screen 2:**
- Display name input (same as today)
- On submit: create `members` row with `user_id` set if signed in, null if anonymous
- Save `member_id` + `display_name` to localStorage under `trip_member_{tripId}`
- Redirect to `/trips/[id]`

Returning signed-in users visiting a new trip skip Screen 1 and see only Screen 2.

---

### 3. "My Trips" Dashboard

**Location:** Landing page (`/`), above the "Create a trip" form.

**Shown only when signed in.** When not signed in, page looks identical to today.

**Content:** List of trips where `members.user_id = current user's id`. Each card shows:
- Trip name
- Destination
- Member count
- Confirmed date, or "No date set" if none

Tapping a card navigates to `/trips/[id]`.

**Empty state:** "No trips yet — create one below."

The "Create a trip" form remains at the bottom, always visible regardless of sign-in state.

---

### 4. Trip Photo

**Storage:** Supabase Storage bucket `trip-photos`, public read access.

**Display:** Circular avatar (64px) in the trip header, left of the trip name. If no photo set, shows a placeholder (generic travel icon or initials of trip name).

**Upload:** Tapping the photo opens a file picker (image files only). On select:
- Upload to `trip-photos/{trip_id}/{timestamp}-{filename}`
- Update `trips.photo_url` with the public URL
- Header updates immediately via optimistic UI

**Who can change it:** Any member (consistent with fully open collaboration model).

**Implementation notes:**
- Accept `image/*` only, no size enforcement in v1
- Old photos are not deleted from storage (acceptable for v1)

---

### 5. Leave / Delete Trip

Accessed via a three-dot (⋯) menu icon in the trip header.

**All members see:**
- **Leave trip** — confirms in a bottom sheet ("Leave [trip name]? You'll lose access unless you rejoin."). On confirm:
  - Delete the user's `members` row
  - Clear `trip_member_{tripId}` from localStorage
  - Redirect to `/` with toast "You've left [trip name]"

**Trip creator** (`trips.created_by_user_id` matches current user's `user_id`) additionally sees:
- **Delete trip** — confirms in a bottom sheet with a red button ("This will permanently delete the trip and all its data for everyone."). On confirm:
  - Delete the `trips` row (cascade deletes all related data)
  - Redirect to `/`

**Guard:** If the creator tries to "Leave trip" without deleting, show a nudge: "You created this trip. To leave, you'll need to delete it."

**Anonymous users:** Can leave but not delete (creator privileges require a signed-in account with a matching `user_id`).

---

### 6. Delete Dates

**Trigger:** In the availability grid, each date column header shows a small ✕ button on hover (desktop) or long-press (mobile).

**Confirmation:** Bottom sheet — "Remove [formatted date] from the trip? Everyone's availability for this date will be deleted." Red confirm button.

**On confirm:**
- Delete all `availability` rows where `date = selected_date` and `member_id IN (members of this trip)`
- Date disappears from the grid (derived from existing rows — no separate date-range table)

**Who can delete:** Any member.

---

### 7. Multi-Select Polls

**Poll creation:** Toggle "Allow multiple selections" (off by default) in the create poll form. Stored as `polls.allow_multiple`.

**Voting — single-select (existing behavior):** Tapping an option selects it, replaces any previous vote. One `votes` row per member per poll.

**Voting — multi-select:** Options render as checkboxes. Checking creates a `votes` row for that `(poll_id, member_id, option_id)`. Unchecking deletes that row. Any number of options can be selected.

**Results display:**
- Single-select: percentages out of total voters (existing)
- Multi-select: percentages out of total members (e.g. "4/6 members chose this")

**Visual indicator:** Poll cards show a small "Multiple choice" label when `allow_multiple` is true.

---

### 8. Create New Trip Link

A "Create new trip" text link in the trip header (below the trip name). Navigates to `/`. No new page or UI needed — the landing page already has the create form.

---

## Page / Route Changes

| Route | Change |
|---|---|
| `/` | Add "My trips" section (signed-in only); add sign-in/out in header |
| `/trips/[id]` | Add trip photo, three-dot menu (leave/delete), "Create new trip" link |
| `/trips/[id]/join` | Add sign-in screen (Screen 1) before display name |
| `/auth/callback` | New — Supabase OAuth redirect handler |

---

## Error Handling & Edge Cases

- If a signed-in user's `user_id` matches a member row but localStorage is missing (e.g. new device), we restore their localStorage and skip the join screen
- Deleting a trip while other members are viewing it: they'll see a 404 on next navigation (acceptable for v1)
- Leave trip when already the only member: allowed; trip remains but has zero members
- Multi-select poll with zero options selected: allowed (member simply has no votes)
- Trip photo upload failure: show error toast, keep existing photo

---

## Out of Scope (v1)

- Password or email/magic-link auth
- Transferring trip ownership
- Merging anonymous participation with a later-created account
- Notifications when trip is deleted
- Storage cleanup (old photos remain in bucket)
