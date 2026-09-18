'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useStageRegistry, type SceneKey } from '@/lib/stage-registry'
import { useExperience } from '@/lib/store'

type Props = {
  scene: SceneKey
  props?: Record<string, unknown>
  index?: number
  className?: string
  /** Marge de pré-montage autour du viewport. */
  rootMargin?: string
  /** Rendu CSS affiché en mode réduit, sans WebGL, ou pendant le chargement. */
  fallback?: ReactNode
  /** N'active la vue qu'en mode complet (scènes lourdes). */
  fullOnly?: boolean
  /** Désactive temporairement la vue (le fallback CSS prend le relais). */
  disabled?: boolean
  children?: ReactNode
}

/**
 * Déclare une zone rendue par le canvas R3F unique.
 * - IntersectionObserver : la scène n'est montée que près du viewport, puis démontée.
 * - Aucun import de three.js ici : seul le registre est mis à jour.
 */
export function StageView({
  scene,
  props,
  index = 1,
  className,
  rootMargin = '20% 0px',
  fallback,
  fullOnly = false,
  disabled = false,
  children,
}: Props) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const mode = useExperience((s) => s.mode)
  const webglRequested = useExperience((s) => s.webglRequested)
  const stageReady = useExperience((s) => s.stageReady)
  const register = useStageRegistry((s) => s.register)
  const update = useStageRegistry((s) => s.update)
  const unregister = useStageRegistry((s) => s.unregister)
  const propsRef = useRef(props ?? {})
  propsRef.current = props ?? {}

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  const allowed = mode === 'full' || (mode === 'lite' && !fullOnly)
  const active = inView && allowed && webglRequested && !disabled

  useEffect(() => {
    if (!active) return
    register({ id, scene, track: ref, props: propsRef.current, index })
    return () => unregister(id)
  }, [active, id, scene, index, register, unregister])

  const serialized = JSON.stringify(props ?? {})
  useEffect(() => {
    if (active) update(id, propsRef.current)
  }, [serialized, active, id, update])

  const live = active && stageReady

  return (
    <div ref={ref} className={className} data-stage-view={scene} data-live={live ? 'true' : undefined}>
      {fallback && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{ opacity: live ? 0 : 1 }}
          aria-hidden="true"
        >
          {fallback}
        </div>
      )}
      {children}
    </div>
  )
}
