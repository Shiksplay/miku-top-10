'use client'

import { MOTION_STORAGE_KEY } from '@/lib/capability'
import { useExperience } from '@/lib/store'

/**
 * Toggle « Réduire les animations ». Par défaut il suit prefers-reduced-motion ;
 * le choix explicite est mémorisé. Réduit : pas de WebGL animé, pas de smooth-scroll,
 * pas de parallax ni de particules.
 */
export function MotionToggle({ withLabel = false, className = '' }: { withLabel?: boolean; className?: string }) {
  const reduced = useExperience((s) => s.reducedMotion)
  const setReducedMotion = useExperience((s) => s.setReducedMotion)

  const toggle = () => {
    const next = !reduced
    setReducedMotion(next)
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, next ? 'reduced' : 'full')
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={reduced}
      className={`group inline-flex min-h-11 items-center gap-2.5 rounded-full px-3.5 text-small text-paper transition-colors hover:text-pink ${className}`}
    >
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" className="shrink-0">
        <path
          d={reduced ? 'M1 7 H21' : 'M1 7 C3.5 1, 5.5 1, 8 7 S12.5 13, 15 7 S19.5 1, 21 7'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          style={{ transition: 'd 0.4s' }}
        />
      </svg>
      <span className={withLabel ? '' : 'visually-hidden'}>Réduire les animations</span>
      {withLabel && (
        <span className="text-micro text-ash" aria-hidden="true">
          {reduced ? 'activé' : 'désactivé'}
        </span>
      )}
    </button>
  )
}
