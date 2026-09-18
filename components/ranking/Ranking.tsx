'use client'

import { useEffect, useRef } from 'react'
import { countdown, songBySlug } from '@/data/songs'
import { useExperience } from '@/lib/store'
import { RankingRow } from './RankingRow'

export function Ranking() {
  const section = useRef<HTMLElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const setActive = useExperience((s) => s.setActive)
  const mode = useExperience((s) => s.mode)
  const hydrated = useExperience((s) => s.hydrated)

  // Morceau actif = rangée qui traverse la bande centrale du viewport.
  // Il pilote la couleur du fond (ShaderGradient), l'accent --song et le mini-lecteur.
  useEffect(() => {
    const rows = [...(list.current?.querySelectorAll<HTMLElement>('.rank-row') ?? [])]
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.slug ?? null)
        })
      },
      { rootMargin: '-48% 0px -48% 0px' },
    )
    rows.forEach((r) => io.observe(r))
    // Hors du classement (la section ne croise plus la ligne médiane) : retour au fond du hero.
    const outer = new IntersectionObserver(
      ([e]) => {
        if (e && !e.isIntersecting) setActive(null)
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    if (section.current) outer.observe(section.current)
    return () => {
      io.disconnect()
      outer.disconnect()
    }
  }, [setActive])

  // Accent CSS du morceau actif (transition douce via @property --song).
  useEffect(
    () =>
      useExperience.subscribe((s, prev) => {
        if (s.activeSlug === prev.activeSlug) return
        const song = s.activeSlug ? songBySlug(s.activeSlug) : undefined
        document.documentElement.style.setProperty('--song', song?.accent ?? 'var(--accent)')
      }),
    [],
  )

  // Numéros : les axes wdth/wght suivent le scroll (GSAP ScrollTrigger), avec parallax léger des visuels.
  useEffect(() => {
    if (!hydrated || mode === 'reduced') return
    let ctx: { revert: () => void } | null = null
    let cancelled = false
    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      if (cancelled || !list.current) return
      gsap.registerPlugin(ScrollTrigger)
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('.rank-row').forEach((row) => {
          const numeral = row.querySelector('.rank-numeral')
          if (numeral) {
            gsap.fromTo(
              numeral,
              { '--rank-wdth': 50, '--rank-wght': 140 },
              {
                '--rank-wdth': 100,
                '--rank-wght': 860,
                ease: 'none',
                scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 20%', scrub: 0.5 },
              },
            )
          }
          const tile = row.querySelector('.art-track')
          if (tile && mode === 'full') {
            gsap.fromTo(
              tile,
              { yPercent: 3.5 },
              { yPercent: -3.5, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } },
            )
          }
        })
      }, list.current)
      ScrollTrigger.refresh()
    })()
    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [hydrated, mode])

  return (
    <section
      id="classement"
      ref={section}
      tabIndex={-1}
      aria-labelledby="classement-title"
      className="relative scroll-mt-[var(--header-h)] pt-[var(--space-section)] outline-none"
    >
      <div className="piano-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <header className="relative grid gap-6 px-[var(--gutter)] lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-[clamp(1.5rem,3vw,3.5rem)]">
        <p className="text-small text-ash tabular lg:pt-4">2007–2024</p>
        <div>
          <h2
            id="classement-title"
            className="font-display text-heading"
            style={{ '--wdth': 118, '--wght': 820 } as React.CSSProperties}
          >
            Le classement
          </h2>
          <p className="mt-6 max-w-[56ch] text-lead text-paper/85">
            Dix titres, du n°10 au n°1. Chacun a sa couleur : la page la prend quand vous passez dessus.
            Survolez un titre pour voir son rythme. Pour l’écouter, les liens mènent vers les plateformes
            officielles.
          </p>
        </div>
      </header>

      <ol ref={list} className="relative mt-[clamp(2rem,8vh,5rem)]" aria-label="Classement, du numéro 10 au numéro 1">
        {countdown.map((song) => (
          <RankingRow key={song.slug} song={song} />
        ))}
      </ol>
    </section>
  )
}
