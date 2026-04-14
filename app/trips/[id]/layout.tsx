import { getSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = getSupabaseServerClient()
  const { data: trip } = await supabase
    .from('trips')
    .select('name, destination, photo_url')
    .eq('id', id)
    .single()

  if (!trip) return { title: 'Tripkit' }

  return {
    title: `${trip.name} | Tripkit`,
    openGraph: {
      title: trip.name,
      description: trip.destination ?? 'Join the trip on Tripkit',
      ...(trip.photo_url && { images: [{ url: trip.photo_url }] }),
    },
  }
}

export default async function TripLayout({ children, params }: Props) {
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
