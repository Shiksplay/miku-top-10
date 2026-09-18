'use client'

import { useEffect, useRef } from 'react'
import { pointer, useExperience } from '@/lib/store'

const REST_WDTH = 112
const REST_WGHT = 820

/**
 * Avances des glyphes d'Anybody (wdth 112, wght 820), en em, mesurées dans le
 * navigateur. Chaque lettre reçoit cette largeur dès le rendu serveur : la mise en
 * page du titre ne dépend plus de la police chargée, donc zéro décalage (CLS) quand
 * la police de secours est remplacée.
 */
const ADVANCE: Record<string, number> = {
  M: 1.07, i: 0.3506, k: 0.7486, u: 0.7745, ',': 0.3666, e: 0.7886, n: 0.7766, ' ': 0.3,
  d: 0.7961, x: 0.7741, m: 1.1436, o: 0.792, r: 0.7736, c: 0.74, a: 0.79,
}

type Props = { lines: string[]; id?: string; className?: string }

/**
 * Titre « vibrato » : près du curseur, l'axe de largeur de la police variable ondule
 * comme une note tenue. Un balayage « chanté » traverse le titre à l'entrée, et le
 * défilement l'amincit (decrescendo).
 *
 * Aucun décalage de mise en page (CLS) : chaque lettre occupe un emplacement de
 * largeur figée, sa croissance part du bord gauche, et le recentrage passe par un
 * transform, que la mesure CLS ignore.
 */
export function KineticTitle({ lines, id, className = '' }: Props) {
  const root = useRef<HTMLSpanElement>(null)
  const mode = useExperience((s) => s.mode)
  const loaderDone = useExperience((s) => s.loaderDone)

  useEffect(() => {
    const el = root.current
    if (!el || mode === 'reduced') return
    const slots = [...el.querySelectorAll<HTMLSpanElement>('.kt-slot')]
    const chars = slots.map((s) => s.firstElementChild as HTMLSpanElement)
    let widths: number[] = []
    let centers: { x: number; y: number }[] = []
    let sigma = 60

    // Les emplacements ont déjà leur largeur fixe (em, rendu serveur) : on lit juste la géométrie.
    const measure = () => {
      const base = el.getBoundingClientRect()
      widths = slots.map((s) => s.getBoundingClientRect().width)
      centers = slots.map((s) => {
        const r = s.getBoundingClientRect()
        return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }
      })
      const avg = widths.reduce((a, b) => a + b, 0) / Math.max(1, widths.length)
      sigma = avg * 1.25
    }

    let raf = 0
    let running = false
    let introStart = -1
    let lastProgress = -1
    let thanksStart = -1
    const total = chars.length

    const frame = (now: number) => {
      const base = el.getBoundingClientRect()
      const progress = useExperience.getState().heroProgress
      const t = now / 1000
      const px = pointer.x - base.left
      const py = pointer.y - base.top
      const pointerLive = pointer.active && now - pointer.lastMove < 1800
      const intro = introStart < 0 ? -1 : (now - introStart) / 1700
      const thanks = thanksStart < 0 ? -1 : (now - thanksStart) / 1400
      let energy = 0

      chars.forEach((c, i) => {
        const w = widths[i] ?? 0
        const center = centers[i]
        if (!center) return
        let g = 0
        if (pointerLive) {
          const dx = px - center.x
          const dy = (py - center.y) * 1.6
          g = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))
        }
        const pos = i / Math.max(1, total - 1)
        if (intro >= 0 && intro <= 1.3) {
          const head = intro * 1.4 - 0.2
          g = Math.max(g, Math.exp(-((pos - head) ** 2) / (2 * 0.06 ** 2)))
        }
        if (thanks >= 0 && thanks <= 1.3) {
          g = Math.max(g, Math.exp(-((pos - (thanks * 1.4 - 0.2)) ** 2) / (2 * 0.1 ** 2)))
        }
        const vibrato = 0.62 + 0.38 * Math.sin(t * 11 - i * 0.55)
        const wdth = Math.min(150, REST_WDTH + 38 * g * vibrato)
        const wght = Math.max(260, REST_WGHT - progress * 520 + 70 * g)
        // Largeur estimée du glyphe (axe wdth + léger effet de la graisse), recentrée dans son emplacement.
        const k = (wdth / REST_WDTH) * (1 + (wght - REST_WGHT) * 0.00016)
        c.style.fontVariationSettings = `'wdth' ${wdth.toFixed(1)}, 'wght' ${wght.toFixed(0)}`
        c.style.transform = `translate3d(${(-(k - 1) * w * 0.5).toFixed(2)}px,0,0)`
        energy = Math.max(energy, g)
      })

      const settled =
        energy < 0.004 &&
        !pointerLive &&
        (intro < 0 || intro > 1.3) &&
        (thanks < 0 || thanks > 1.3) &&
        Math.abs(progress - lastProgress) < 0.0005
      lastProgress = progress
      if (settled) {
        running = false
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(frame)
    }

    let ready = false
    document.fonts.ready.then(() => {
      measure()
      ready = true
      wake()
    })

    const onResize = () => {
      if (!ready) return
      measure()
      wake()
    }
    const onThanks = () => {
      thanksStart = performance.now()
      wake()
    }
    const unsubscribe = useExperience.subscribe((s, prev) => {
      if (s.loaderDone && !prev.loaderDone) {
        introStart = performance.now() + 150
        wake()
      }
      if (s.heroProgress !== prev.heroProgress) wake()
    })
    if (useExperience.getState().loaderDone) introStart = performance.now()

    window.addEventListener('pointermove', wake, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('miku:thanks', onThanks)
    return () => {
      cancelAnimationFrame(raf)
      unsubscribe()
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('miku:thanks', onThanks)
      chars.forEach((c) => {
        c.style.fontVariationSettings = ''
        c.style.transform = ''
      })
    }
  }, [mode])

  return (
    <h1 id={id} className={className}>
      <span className="visually-hidden">{lines.join(' ')}</span>
      <span
        ref={root}
        aria-hidden="true"
        className="kinetic block"
        data-intro={loaderDone ? 'done' : 'pending'}
      >
        {lines.map((line, li) => (
          <span key={li} className="flex whitespace-nowrap">
            {[...line].map((ch, ci) => (
              <span
                key={ci}
                className="kt-slot block shrink-0"
                style={ADVANCE[ch] ? { width: `${ADVANCE[ch]}em` } : undefined}
              >
                <span className="vibrato-char">{ch === ' ' ? ' ' : ch}</span>
              </span>
            ))}
          </span>
        ))}
      </span>
    </h1>
  )
}
