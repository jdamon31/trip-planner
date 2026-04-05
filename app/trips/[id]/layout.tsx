import { getSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = getSupabaseServerClient()
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  return <>{children}</>
}
