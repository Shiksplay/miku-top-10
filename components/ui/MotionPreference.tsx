'use client'

import { MotionConfig } from 'framer-motion'
import { useExperience } from '@/lib/store'

/** Applique le mode réduit (préférence OS ou toggle) aux composants framer-motion. */
export function MotionPreference({ children }: { children: React.ReactNode }) {
  const mode = useExperience((s) => s.mode)
  return <MotionConfig reducedMotion={mode === 'reduced' ? 'always' : 'never'}>{children}</MotionConfig>
}
