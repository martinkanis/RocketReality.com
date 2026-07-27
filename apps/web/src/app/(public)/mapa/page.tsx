import type { Metadata } from 'next'
import { ListingsMap } from '@/features/map/listings-map'

export const metadata: Metadata = {
  title: 'Mapa nemovitostí',
  description: 'Hledejte nemovitosti přímo na mapě České republiky.',
}

export default function MapPage() {
  return <ListingsMap />
}
