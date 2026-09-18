'use client'

import dynamic from 'next/dynamic'
import { useExperience } from '@/lib/store'

// Couches d'interface qui n'apparaissent qu'après le chargement (vue détail, lecteur,
// easter egg). Chargées à la demande : framer-motion reste hors du bundle initial.
const SongDetail = dynamic(() => import('@/components/detail/SongDetail').then((m) => m.SongDetail), { ssr: false })
const MiniPlayer = dynamic(() => import('@/components/layout/MiniPlayer').then((m) => m.MiniPlayer), { ssr: false })
const EasterEggs = dynamic(() => import('@/components/ui/EasterEggs').then((m) => m.EasterEggs), { ssr: false })

export function LazyOverlays() {
  const hydrated = useExperience((s) => s.hydrated)
  if (!hydrated) return null
  return (
    <>
      <MiniPlayer />
      <SongDetail />
      <EasterEggs />
    </>
  )
}
