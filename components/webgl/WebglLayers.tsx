'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useExperience } from '@/lib/store'

// Code-splitting strict : three.js, R3F, drei et shadergradient n'entrent jamais
// dans le bundle initial. Ils sont chargés côté client uniquement (ssr: false).
const Backdrop = dynamic(() => import('./Backdrop'), { ssr: false })
const Stage = dynamic(() => import('./Stage'), { ssr: false })

/**
 * Pile des couches visuelles plein écran :
 *   .layer-static   dégradé CSS (toujours présent : fallback + mode réduit)
 *   .layer-backdrop ShaderGradient (contexte WebGL n°1)
 *   .layer-stage    canvas R3F mutualisé (contexte WebGL n°2)
 * Le verre liquide utilise le contexte n°3 (components/glass).
 */
export function WebglLayers() {
  const mode = useExperience((s) => s.mode)
  const loaderDone = useExperience((s) => s.loaderDone)
  const webglRequested = useExperience((s) => s.webglRequested)
  const requestWebgl = useExperience((s) => s.requestWebgl)

  // MODE ALLÉGÉ : WebGL différé jusqu'à la première interaction (ou 6 s après le
  // chargement) pour garder le thread principal libre pendant le chargement mobile.
  useEffect(() => {
    if (mode !== 'lite' || !loaderDone || webglRequested) return
    const go = () => requestWebgl()
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll']
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }))
    const timer = window.setTimeout(go, 6000)
    return () => {
      window.clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, go))
    }
  }, [mode, loaderDone, webglRequested, requestWebgl])

  const webgl = mode !== 'reduced' && webglRequested

  return (
    <>
      <div className="layer-static" aria-hidden="true" />
      {webgl && <Backdrop />}
      {webgl && <Stage />}
    </>
  )
}
