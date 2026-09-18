'use client'

import { useEffect, useState } from 'react'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { MotionToggle } from '@/components/ui/MotionToggle'
import { StageView } from '@/components/webgl/StageView'
import { scrollToTarget } from '@/lib/scroll'
import { useExperience } from '@/lib/store'

const links = [
  { href: '#classement', label: 'Le classement', short: 'Classement' },
  { href: '#univers', label: 'L’univers Miku', short: 'Univers' },
]

function useCurrentSection() {
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    const targets = links
      .map((l) => document.querySelector<HTMLElement>(l.href))
      .filter((el): el is HTMLElement => el !== null)
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = `#${e.target.id}`
          setCurrent((prev) => (e.isIntersecting ? id : prev === id ? null : prev))
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])
  return current
}

export function Header() {
  const current = useCurrentSection()
  const detailOpen = useExperience((s) => s.detailSlug !== null)
  const scrolled = useExperience((s) => s.heroProgress > 0.55)

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    scrollToTarget(href, href === '#top' ? 0 : -8)
    const target = document.querySelector<HTMLElement>(href === '#top' ? '#contenu' : href)
    target?.focus({ preventScroll: true })
  }

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-[var(--header-h)] items-center justify-between gap-4 px-[var(--gutter)]"
      inert={detailOpen}
    >
      <div className="header-scrim" data-on={scrolled && !detailOpen} aria-hidden="true" />
      <a
        href="#top"
        onClick={(e) => go(e, '#top')}
        data-scrolled={scrolled}
        className="brand group relative flex min-h-11 items-center gap-3 rounded-full pr-2"
      >
        <span id="brand-mark" className="relative block h-11 w-11 shrink-0" aria-hidden="true">
          {/* Métal liquide au-dessus du hero ; une fois la page défilée, version CSS dans une pastille. */}
          <StageView
            scene="logo-metal"
            index={2}
            rootMargin="0px"
            disabled={scrolled}
            className="absolute inset-0"
            fallback={
              <span
                className="font-display flex h-full w-full items-center justify-center text-[1.35rem] leading-none"
                style={
                  {
                    '--wdth': 150,
                    '--wght': 900,
                    background: 'linear-gradient(160deg, #F4F3F1 10%, var(--accent) 45%, #0E3B38 90%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  } as React.CSSProperties
                }
              >
                39
              </span>
            }
          />
        </span>
        <span className="text-small font-medium tracking-tight max-md:visually-hidden">Miku, en dix morceaux</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-full mt-2 w-max rounded-full bg-paper px-3 py-1 text-micro text-void opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          39 → mi-ku → san-kyū, « merci »
        </span>
      </a>

      <GlassSurface
        as="nav"
        aria-label="Navigation principale"
        shape="pill"
        tint={0.18}
        watchRect
        className="flex items-center gap-0.5 p-1"
      >
        <ul className="flex items-center gap-0.5">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => go(e, l.href)}
                aria-current={current === l.href ? 'location' : undefined}
                className="relative inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-small text-paper transition-colors hover:text-pink aria-[current=location]:bg-paper/10 md:px-4"
              >
                <span className="md:hidden">{l.short}</span>
                <span className="max-md:hidden">{l.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <MotionToggle />
      </GlassSurface>
    </header>
  )
}
