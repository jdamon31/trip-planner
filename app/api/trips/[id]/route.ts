import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updateFields: Record<string, unknown> = {}
  if (typeof body.name !== 'undefined') updateFields.name = body.name?.trim() || undefined
  if (typeof body.destination !== 'undefined') updateFields.destination = body.destination?.trim() || null
  if (typeof body.photo_url !== 'undefined') updateFields.photo_url = body.photo_url
  if (typeof body.date_ranges !== 'undefined') updateFields.date_ranges = body.date_ranges

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from('trips')
    .update(updateFields)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseServerClient()

  const { error } = await supabase.from('trips').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
