import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { displayName } = await request.json()

  if (!displayName?.trim()) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  const { id } = await params

  const supabase = getSupabaseServerClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', id)
    .single()

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('members')
    .insert({ trip_id: id, display_name: displayName.trim() })
    .select('id, display_name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, displayName: data.display_name })
}
