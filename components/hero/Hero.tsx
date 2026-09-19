'use client'

import { useEffect, useRef } from 'react'
import { StageView } from '@/components/webgl/StageView'
import { scrollToTarget } from '@/lib/scroll'
import { useExperience } from '@/lib/store'
import { KineticTitle } from './KineticTitle'

export function Hero() {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLDivElement>(null)
  const setHeroProgress = useExperience((s) => s.setHeroProgress)
  const mode = useExperience((s) => s.mode)

  // Progression de sortie du hero (0 → 1) : pilote le decrescendo du titre,
  // la montée du blob et un parallax léger (désactivé en mode réduit).
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = section.current
      if (!el) return
      const h = el.offsetHeight || 1
      const p = Math.min(1, Math.max(0, window.scrollY / h))
      setHeroProgress(p)
      if (title.current) {
        title.current.style.transform = mode === 'reduced' ? '' : `translate3d(0, ${(-p * 90).toFixed(1)}px, 0)`
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [setHeroProgress, mode])

  return (
    <section
      id="top"
      ref={section}
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] flex-col justify-end px-[var(--gutter)] pb-[max(2.5rem,7vh)] pt-[calc(var(--header-h)+6vh)]"
    >
      <StageView scene="hero-blob" rootMargin="0px" className="absolute inset-0" />

      <div ref={title} className="hero-title relative will-change-transform">
        <KineticTitle
          id="hero-title"
          lines={['Miku,', 'en dix', 'morceaux']}
          className="font-display text-display text-paper"
        />
      </div>

      <div className="relative mt-[max(2rem,5vh)] grid items-end gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <p className="max-w-[40ch] text-lead text-pretty text-paper/90">
          Le classement des dix chansons qui ont fait d’une voix de synthèse une star mondiale, de 2007
          à aujourd’hui. Les visuels sont générés en direct. Au survol, chaque carte dévoile la
          miniature de la vidéo officielle.
        </p>
        <a
          href="#classement"
          onClick={(e) => {
            e.preventDefault()
            scrollToTarget('#classement', -8)
            document.getElementById('classement')?.focus({ preventScroll: true })
          }}
          className="inline-flex min-h-12 items-center justify-center gap-3 self-start rounded-full bg-pink px-6 text-body font-semibold text-void transition-[scale,background-color] duration-300 ease-[var(--ease-voice)] hover:scale-[1.03] hover:bg-paper active:scale-[0.96] md:self-end"
        >
          Découvrir le classement
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M7 1v12M1.5 7.5 7 13l5.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </a>
      </div>
    </section>
  )
}
