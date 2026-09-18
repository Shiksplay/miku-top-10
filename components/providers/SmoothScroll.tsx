'use client'

import { useEffect } from 'react'
import { scrollState, useExperience } from '@/lib/store'
import { setLenis } from '@/lib/scroll'
import { ticker } from '@/lib/ticker'

/**
 * Lenis (smooth-scroll) piloté par le ticker GSAP pour que ScrollTrigger et Lenis
 * partagent la même horloge. Désactivé en mode réduit : défilement natif.
 */
export function SmoothScroll() {
  const mode = useExperience((s) => s.mode)
  const hydrated = useExperience((s) => s.hydrated)

  useEffect(() => {
    if (!hydrated) return

    const onNativeScroll = () => {
      scrollState.y = window.scrollY
    }

    if (mode === 'reduced') {
      window.addEventListener('scroll', onNativeScroll, { passive: true })
      onNativeScroll()
      return () => window.removeEventListener('scroll', onNativeScroll)
    }

    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (disposed) return
      gsap.registerPlugin(ScrollTrigger)

      const lenis = new Lenis({
        lerp: mode === 'lite' ? 0.14 : 0.1,
        wheelMultiplier: 1,
        // Sur mobile, on garde le défilement tactile natif (plus fiable, moins coûteux).
        syncTouch: false,
      })
      setLenis(lenis)

      lenis.on('scroll', (l: { scroll: number; velocity: number }) => {
        scrollState.y = l.scroll
        scrollState.velocity = l.velocity
        ScrollTrigger.update()
      })

      const tick = (time: number) => {
        lenis.raf(time * 1000)
        ticker.run(time)
      }
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
      ScrollTrigger.refresh()

      cleanup = () => {
        gsap.ticker.remove(tick)
        lenis.destroy()
        setLenis(null)
      }
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [mode, hydrated])

  return null
}
