'use client'

import { useEffect } from 'react'
import {
  MOTION_STORAGE_KEY,
  detectCapability,
  forcedReducedFromUrl,
} from '@/lib/capability'
import { pointer, useExperience } from '@/lib/store'
import { SmoothScroll } from './SmoothScroll'

function useCapabilityAndMotion() {
  const setCapability = useExperience((s) => s.setCapability)
  const setReducedMotion = useExperience((s) => s.setReducedMotion)
  const setHydrated = useExperience((s) => s.setHydrated)

  useEffect(() => {
    setCapability(detectCapability())

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const resolve = () => {
      if (forcedReducedFromUrl()) return true
      let stored: string | null = null
      try {
        stored = localStorage.getItem(MOTION_STORAGE_KEY)
      } catch {}
      return stored ? stored === 'reduced' : media.matches
    }
    setReducedMotion(resolve())
    setHydrated()

    const onChange = () => setReducedMotion(resolve())
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [setCapability, setReducedMotion, setHydrated])

  const mode = useExperience((s) => s.mode)
  const hydrated = useExperience((s) => s.hydrated)
  useEffect(() => {
    if (!hydrated) return
    document.documentElement.setAttribute('data-motion', mode === 'reduced' ? 'reduced' : 'full')
    document.documentElement.setAttribute('data-mode', mode)
  }, [mode, hydrated])
}

function usePointerTracking() {
  useEffect(() => {
    let lastX = 0
    let lastY = 0
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.vx = pointer.vx * 0.8 + (e.clientX - lastX) * 0.2
      pointer.vy = pointer.vy * 0.8 + (e.clientY - lastY) * 0.2
      lastX = e.clientX
      lastY = e.clientY
      pointer.active = e.pointerType === 'mouse' || e.pointerType === 'pen'
      pointer.lastMove = performance.now()
    }
    const onLeave = () => {
      pointer.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])
}

export function Providers({ children }: { children: React.ReactNode }) {
  useCapabilityAndMotion()
  usePointerTracking()

  return (
    <>
      <SmoothScroll />
      {children}
    </>
  )
}
