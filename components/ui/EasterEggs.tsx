'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { MotionPreference } from './MotionPreference'

/**
 * Easter eggs :
 *  1. (layout.tsx) la teinte de l'accent glisse légèrement à chaque rechargement ;
 *  2. taper « 39 » (mi-ku = san-kyū, « merci ») : le titre rejoue son vibrato,
 *     l'accent fait un tour de teinte et un petit merci s'affiche.
 */
export function EasterEggs() {
  const [thanks, setThanks] = useState(false)

  useEffect(() => {
    let buffer = ''
    let timer = 0
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (e.key.length !== 1) return
      buffer = (buffer + e.key.toLowerCase()).slice(-4)
      if (buffer.endsWith('39') || buffer.endsWith('miku')) {
        buffer = ''
        window.dispatchEvent(new Event('miku:thanks'))
        const root = document.documentElement
        const base = parseFloat(getComputedStyle(root).getPropertyValue('--hue-shift')) || 0
        root.style.setProperty('--hue-shift', `${base + 360}deg`)
        setThanks(true)
        window.clearTimeout(timer)
        // +360° : la teinte fait un tour complet et retombe sur la même couleur.
        timer = window.setTimeout(() => setThanks(false), 3200)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <MotionPreference>
    <div role="status" aria-live="polite" className="pointer-events-none fixed left-[var(--gutter)] top-[calc(var(--header-h)+0.5rem)] z-[60]">
      <AnimatePresence>
        {thanks && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="rounded-full bg-paper px-4 py-2 text-small font-semibold text-void"
          >
            <span lang="ja">サンキュー</span> ! Merci de votre visite.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
    </MotionPreference>
  )
}
