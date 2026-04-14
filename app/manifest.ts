import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tripkit',
    short_name: 'Tripkit',
    description: 'Plan trips together',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8EF',
    theme_color: '#6B8E23',
    icons: [
      { src: '/icon', sizes: '192x192', type: 'image/png' },
      { src: '/icon', sizes: '512x512', type: 'image/png' },
    ],
  }
}
