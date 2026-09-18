'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { MotionPreference } from '@/components/ui/MotionPreference'
import { countdown, eraLabel, genreLabel, songBySlug } from '@/data/songs'
import { lockScroll } from '@/lib/scroll'
import { useExperience } from '@/lib/store'

const EASE = [0.16, 1, 0.3, 1] as const

/** Le contenu sous le verre change : recapture (mode complet uniquement). */
function refreshGlass(delay = 250) {
  if (useExperience.getState().mode !== 'full') return
  import('@/components/glass/liquid-glass').then(({ GlassEngine }) => GlassEngine.peek()?.invalidate(delay))
}

function useFocusTrap(active: boolean, root: React.RefObject<HTMLElement | null>, onEscape: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape()
        return
      }
      if (e.key !== 'Tab' || !root.current) return
      const focusables = [
        ...root.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ].filter((el) => el.offsetParent !== null || el === document.activeElement)
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, root, onEscape])
}

export function SongDetail() {
  const slug = useExperience((s) => s.detailSlug)
  const closeDetail = useExperience((s) => s.closeDetail)
  const openDetail = useExperience((s) => s.openDetail)
  const releaseStage = useExperience((s) => s.releaseStage)
  const song = slug ? songBySlug(slug) : undefined
  const dialog = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  const open = Boolean(song)

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement as HTMLElement | null
    document.documentElement.setAttribute('data-stage', 'detail')
    lockScroll(true)
    // Modale : le reste de la page sort de l'ordre de tabulation et de l'arbre d'accessibilité.
    const outside = ['#contenu', '#pied-de-page', '#lecteur'].map((s) => document.querySelector(s))
    outside.forEach((el) => el?.setAttribute('inert', ''))
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
    refreshGlass()
    return () => {
      lockScroll(false)
      outside.forEach((el) => el?.removeAttribute('inert'))
      const back = returnFocus.current
      if (back && document.contains(back)) back.focus({ preventScroll: true })
      refreshGlass(700)
    }
  }, [open])

  // Focus remis sur le titre quand on passe d'un morceau à l'autre dans le détail.
  useEffect(() => {
    if (slug) heading.current?.focus({ preventScroll: true })
  }, [slug])

  useFocusTrap(open, dialog, closeDetail)

  const index = song ? countdown.findIndex((s) => s.slug === song.slug) : -1
  const prev = index > 0 ? countdown[index - 1] : undefined
  const next = index >= 0 && index < countdown.length - 1 ? countdown[index + 1] : undefined

  return (
    <MotionPreference>
    <AnimatePresence
      onExitComplete={() => {
        document.documentElement.removeAttribute('data-stage')
        releaseStage()
      }}
    >
      {song && (
        <motion.div
          key="detail"
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
          aria-describedby="detail-hook"
          data-lenis-prevent
          className="fixed inset-0 z-[45] overflow-y-auto overscroll-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <p
            lang={song.titleJa ? 'ja' : undefined}
            aria-hidden="true"
            className="detail-watermark pointer-events-none fixed right-[var(--gutter)] top-[calc(var(--header-h)+5rem)] bottom-6 hidden select-none overflow-hidden lg:block"
          >
            {song.titleJa ?? song.title}
          </p>

          <div className="relative flex min-h-full flex-col px-[var(--gutter)] pb-10 pt-[calc(var(--header-h)+1.5rem)]">
            <div className="flex items-center justify-between gap-4">
              <p className="text-small text-ash">
                <span className="tabular">N°{song.rank}</span> sur 10
              </p>
              <GlassSurface
                as="button"
                variant="button"
                shape="circle"
                type="button"
                onClick={closeDetail}
                aria-label="Fermer le détail et revenir au classement"
                watchRect
                className="grid h-12 w-12 place-items-center text-paper transition-colors hover:text-pink"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2 2l12 12M14 2 2 14" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </GlassSurface>
            </div>

            <motion.div
              key={song.slug}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
              className="mt-auto pt-[28vh] lg:pt-10"
            >
              <GlassSurface
                as="article"
                radius={32}
                tint={0.25}
                params={{ darken: 0.58 }}
                className="w-full max-w-[36rem] p-6 md:p-9"
              >
                <h2
                  ref={heading}
                  id="detail-title"
                  tabIndex={-1}
                  className="font-display text-[clamp(2.1rem,1.1rem+2.4vw,3.6rem)] leading-[0.95] outline-none text-balance [overflow-wrap:anywhere]"
                  style={{ '--wdth': 96, '--wght': 820, color: song.accent } as React.CSSProperties}
                >
                  {song.title}
                </h2>
                {song.titleJa && (
                  <p lang="ja" className="font-jp mt-2 text-lead text-paper/80">
                    {song.titleJa}
                  </p>
                )}
                <p id="detail-hook" className="mt-6 text-lead text-pretty">
                  {song.hook}
                </p>
                <dl className="mt-7 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-small">
                  <dt className="text-ash">Producteur</dt>
                  <dd>{song.producer}</dd>
                  <dt className="text-ash">Année</dt>
                  <dd className="tabular">{song.year}</dd>
                  <dt className="text-ash">Genre</dt>
                  <dd>{genreLabel[song.genre]}</dd>
                  <dt className="text-ash">Époque</dt>
                  <dd>{eraLabel[song.era]}</dd>
                </dl>
                <div className="mt-7 space-y-4 text-body text-paper/85">
                  {song.story.map((p) => (
                    <p key={p.slice(0, 24)} className="text-pretty">
                      {p}
                    </p>
                  ))}
                </div>

                <h3 className="mt-8 text-small font-semibold">Écouter sur les plateformes officielles</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {song.listen.map((l) => (
                    <li key={l.platform}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-small ring-1 ring-inset ring-paper/25 transition-colors hover:bg-pink hover:text-void hover:ring-pink"
                      >
                        {l.platform}
                        <span className="visually-hidden"> : rechercher {song.title} (nouvel onglet)</span>
                        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                          <path d="M2 8 8 2M3 2h5v5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-micro text-ash">
                  Aucun fichier audio ni parole n’est hébergé ici. Les liens ouvrent une recherche sur la
                  plateforme.
                </p>
              </GlassSurface>
            </motion.div>

            <nav aria-label="Morceaux voisins" className="mt-8 flex flex-wrap justify-between gap-3">
              {prev ? (
                <button
                  type="button"
                  onClick={() => openDetail(prev.slug)}
                  className="inline-flex min-h-11 items-center gap-3 rounded-full px-4 text-small text-paper ring-1 ring-inset ring-paper/20 transition-colors hover:text-pink hover:ring-pink"
                >
                  <span aria-hidden="true">←</span>
                  <span>
                    <span className="text-ash">N°{prev.rank}</span> {prev.title}
                  </span>
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button
                  type="button"
                  onClick={() => openDetail(next.slug)}
                  className="inline-flex min-h-11 items-center gap-3 rounded-full px-4 text-small text-paper ring-1 ring-inset ring-paper/20 transition-colors hover:text-pink hover:ring-pink"
                >
                  <span>
                    <span className="text-ash">N°{next.rank}</span> {next.title}
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </nav>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </MotionPreference>
  )
}
