import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { name, destination, createdByUserId } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Trip name is required' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('trips')
    .insert({
      name: name.trim(),
      destination: destination?.trim() || null,
      created_by_user_id: createdByUserId ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
