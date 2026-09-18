'use client'

import { useEffect, useRef, useState } from 'react'
import { VISITED_SESSION_KEY } from '@/lib/capability'
import { useExperience } from '@/lib/store'
import { LiquidMetalRenderer } from './LiquidMetalRenderer'

// Transitions CSS natives (pas de framer-motion) : le loader fait partie du rendu
// initial, chaque kilo-octet de JS y retarde le LCP.
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

function waitFor(predicate: () => boolean, timeout: number) {
  return new Promise<void>((resolve) => {
    if (predicate()) return resolve()
    const started = performance.now()
    const unsub = useExperience.subscribe(() => {
      if (predicate()) {
        unsub()
        resolve()
      }
    })
    const check = () => {
      if (performance.now() - started > timeout) {
        unsub()
        resolve()
      } else if (!predicate()) setTimeout(check, 200)
    }
    setTimeout(check, 200)
  })
}

/**
 * Écran de chargement.
 * La progression est RÉELLE : polices, événement load et, en mode complet, le premier
 * rendu du fond ShaderGradient et du canvas R3F. Le logo « 39 » se remplit de métal
 * liquide au rythme de la progression, puis rejoint sa place dans le header.
 */
export function Loader() {
  const hydrated = useExperience((s) => s.hydrated)
  const mode = useExperience((s) => s.mode)
  const loaderDone = useExperience((s) => s.loaderDone)
  const setLoaderDone = useExperience((s) => s.setLoaderDone)
  const requestWebgl = useExperience((s) => s.requestWebgl)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<LiquidMetalRenderer | null>(null)
  const [progress, setProgress] = useState(0)
  const [metalReady, setMetalReady] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [dock, setDock] = useState<{ x: number; y: number; scale: number } | null>(null)

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    const reduced = mode === 'reduced'
    let repeat = false
    try {
      repeat = sessionStorage.getItem(VISITED_SESSION_KEY) === '1'
      sessionStorage.setItem(VISITED_SESSION_KEY, '1')
    } catch {}
    const minDuration = reduced ? 350 : repeat ? 800 : 1900
    const t0 = performance.now()

    // Le mode complet charge fond + scène pendant le loader ; le mode allégé les
    // diffère après le chargement (voir WebglGate) pour préserver le TBT mobile.
    if (mode === 'full') requestWebgl()

    const tasks: { weight: number; done: boolean; run: () => Promise<unknown> }[] = [
      {
        weight: 0.3,
        done: false,
        run: async () => {
          const family = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-anybody')
            .trim()
          if (family) await document.fonts.load(`900 64px ${family}`).catch(() => undefined)
          await document.fonts.ready
        },
      },
      {
        weight: 0.2,
        done: false,
        run: () =>
          document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise<void>((r) => window.addEventListener('load', () => r(), { once: true })),
      },
    ]
    if (mode === 'full') {
      tasks.push(
        { weight: 0.25, done: false, run: () => waitFor(() => useExperience.getState().backdropReady, 6000) },
        { weight: 0.25, done: false, run: () => waitFor(() => useExperience.getState().stageReady, 6000) },
      )
    }
    const total = tasks.reduce((a, t) => a + t.weight, 0)
    const measured = () => tasks.reduce((a, t) => a + (t.done ? t.weight : 0), 0) / total

    tasks.forEach((t) =>
      t.run().finally(() => {
        t.done = true
        if (t === tasks[0]) rendererRef.current?.uploadLogo()
      }),
    )

    // Valeur affichée : ne dépasse jamais la progression mesurée ni le temps minimal.
    let shown = 0
    let raf = 0
    const loop = () => {
      if (cancelled) return
      const timeFactor = Math.min(1, (performance.now() - t0) / minDuration)
      const target = Math.min(measured(), timeFactor)
      shown += (target - shown) * (reduced ? 1 : 0.08)
      if (target - shown < 0.002) shown = target
      setProgress(shown)
      if (rendererRef.current) rendererRef.current.reveal = shown
      if (shown >= 0.999 && measured() >= 1) {
        const mark = document.getElementById('brand-mark')
        const own = markRef.current
        if (mark && own && !reduced) {
          const a = own.getBoundingClientRect()
          const b = mark.getBoundingClientRect()
          setDock({
            x: b.left + b.width / 2 - (a.left + a.width / 2),
            y: b.top + b.height / 2 - (a.top + a.height / 2),
            scale: b.width / a.width,
          })
        }
        setExiting(true)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [hydrated, mode, requestWebgl])

  // Canvas métal liquide (hors mode réduit)
  useEffect(() => {
    if (!hydrated || mode === 'reduced' || !canvasRef.current) return
    const r = LiquidMetalRenderer.create(canvasRef.current)
    if (!r) return
    rendererRef.current = r
    r.run()
    setMetalReady(true)
    const onMove = (e: PointerEvent) => {
      r.pointer = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      r.destroy()
      rendererRef.current = null
    }
  }, [hydrated, mode])

  const pct = Math.round(progress * 100)
  const exitMs = mode === 'reduced' ? 200 : 1050

  // Filet de sécurité si transitionend ne se déclenche pas (onglet en arrière-plan…).
  useEffect(() => {
    if (!exiting) return
    const t = window.setTimeout(setLoaderDone, exitMs + 700)
    return () => window.clearTimeout(t)
  }, [exiting, exitMs, setLoaderDone])

  if (loaderDone) return null

  return (
        <div
          className="loader fixed inset-0 z-[80] flex flex-col items-center justify-center"
          aria-hidden="true"
          onTransitionEnd={(e) => {
            if (exiting && e.target === e.currentTarget && e.propertyName === 'clip-path') setLoaderDone()
          }}
          style={{
            background: 'var(--color-void)',
            clipPath: exiting ? 'inset(0% 0% 100% 0%)' : 'inset(0% 0% 0% 0%)',
            transition: `clip-path ${exitMs}ms ${EASE} ${exiting ? 250 : 0}ms`,
          }}
        >
          <div
            ref={markRef}
            className="relative aspect-square w-[min(58vw,52vh)]"
            style={{
              transform: dock ? `translate3d(${dock.x}px, ${dock.y}px, 0) scale(${dock.scale})` : 'none',
              transition: `transform 1100ms ${EASE}`,
            }}
          >
            <span
              className="font-display absolute inset-0 flex items-center justify-center text-[min(38vw,34vh)] leading-none transition-opacity duration-700"
              style={
                {
                  '--wdth': 150,
                  '--wght': 900,
                  color: 'transparent',
                  WebkitTextStroke: '1.5px rgba(57,197,187,0.55)',
                  opacity: metalReady ? 0 : 1,
                } as React.CSSProperties
              }
            >
              39
            </span>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full transition-opacity duration-500"
              style={{ opacity: metalReady ? 1 : 0 }}
            />
          </div>

          <div
            className="absolute inset-x-[var(--gutter)] bottom-[max(2rem,6vh)] flex items-end justify-between gap-6 transition-opacity duration-300"
            style={{ opacity: exiting ? 0 : 1 }}
          >
            {/* Hauteur réservée (3 lignes) : le remplacement de police ne décale rien. */}
            <p className="h-[4.5em] max-w-[28ch] overflow-hidden text-small text-ash">
              Mi-ku, san-kyū. Préparation de la scène : shaders, verre liquide et typographie.
            </p>
            <div className="flex w-[min(42vw,22rem)] flex-col items-end gap-2">
              <span
                className="font-display tabular inline-block w-[2.4ch] text-left text-title"
                style={{ '--wdth': 70, '--wght': 300 } as React.CSSProperties}
              >
                {String(pct).padStart(2, '0')}
              </span>
              <div className="h-px w-full bg-paper/15">
                <div
                  className="h-px origin-left bg-teal"
                  style={{ transform: `scaleX(${progress})`, background: 'var(--accent)' }}
                />
              </div>
            </div>
          </div>
        </div>
  )
}
