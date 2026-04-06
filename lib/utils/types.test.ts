import type { Trip, Member, Poll } from '@/lib/supabase/types'

describe('type shapes', () => {
  it('Trip has created_by_user_id and photo_url', () => {
    const t: Trip = {
      id: '1', name: 'Test', destination: null, description: null,
      confirmed_date: null, created_at: '2026-01-01',
      created_by_user_id: 'user-abc', photo_url: null,
    }
    expect(t.created_by_user_id).toBe('user-abc')
    expect(t.photo_url).toBeNull()
  })

  it('Member has user_id', () => {
    const m: Member = {
      id: '1', trip_id: 't1', display_name: 'Alex',
      joined_at: '2026-01-01', user_id: null,
    }
    expect(m.user_id).toBeNull()
  })

  it('Poll has allow_multiple', () => {
    const p: Poll = {
      id: '1', trip_id: 't1', created_by: 'm1',
      question: 'Q?', options: [], created_at: '2026-01-01',
      allow_multiple: false,
    }
    expect(p.allow_multiple).toBe(false)
  })
})
