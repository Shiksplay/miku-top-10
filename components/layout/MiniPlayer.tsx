'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { MotionPreference } from '@/components/ui/MotionPreference'
import { countdown, songBySlug } from '@/data/songs'
import { scrollToTarget } from '@/lib/scroll'
import { useExperience } from '@/lib/store'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Mini-lecteur sticky. Il n'embarque AUCUN audio : « lecture » ouvre la source
 * officielle dans un nouvel onglet, et précédent / suivant parcourent le classement.
 */
export function MiniPlayer() {
  const activeSlug = useExperience((s) => s.activeSlug)
  const heroProgress = useExperience((s) => s.heroProgress)
  const detailOpen = useExperience((s) => s.detailSlug !== null)
  const loaderDone = useExperience((s) => s.loaderDone)
  const [lastSlug, setLastSlug] = useState<string>(countdown[0]?.slug ?? '')

  useEffect(() => {
    if (activeSlug) setLastSlug(activeSlug)
  }, [activeSlug])

  const song = songBySlug(activeSlug ?? lastSlug)
  const visible = loaderDone && heroProgress > 0.85 && !detailOpen && Boolean(song)
  const index = song ? countdown.findIndex((s) => s.slug === song.slug) : -1
  const primary = song?.listen[0]

  const goTo = (i: number) => {
    const target = countdown[i]
    if (!target) return
    scrollToTarget(`#rang-${target.rank}`, -40)
  }

  return (
    <MotionPreference>
    <div id="lecteur" className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <AnimatePresence>
        {visible && song && (
          <motion.div
            key="player"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="pointer-events-auto"
          >
            <GlassSurface
              role="group"
              aria-label="Lecteur du classement"
              shape="pill"
              tint={0.2}
              watchRect
              className="flex items-center gap-2 py-2 pl-2 pr-5 md:gap-3"
            >
              <GlassSurface
                as="button"
                variant="button"
                shape="circle"
                type="button"
                onClick={() => goTo(index - 1)}
                disabled={index <= 0}
                aria-label="Morceau précédent dans le classement"
                className="grid h-11 w-11 place-items-center text-paper transition-opacity disabled:opacity-35"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 2v10M12 2 5 7l7 5z" fill="currentColor" />
                </svg>
              </GlassSurface>
              {primary && (
                <GlassSurface
                  as="a"
                  variant="button"
                  shape="circle"
                  warp
                  href={primary.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Écouter ${song.title} sur ${primary.platform} (recherche, nouvel onglet)`}
                  className="grid h-14 w-14 place-items-center text-paper transition-colors hover:text-pink"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M5 3v12l10-6z" fill="currentColor" />
                  </svg>
                </GlassSurface>
              )}
              <GlassSurface
                as="button"
                variant="button"
                shape="circle"
                type="button"
                onClick={() => goTo(index + 1)}
                disabled={index >= countdown.length - 1}
                aria-label="Morceau suivant dans le classement"
                className="grid h-11 w-11 place-items-center text-paper transition-opacity disabled:opacity-35"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M11 2v10M2 2l7 5-7 5z" fill="currentColor" />
                </svg>
              </GlassSurface>
              <div className="min-w-0 pl-1">
                <p className="max-w-[40vw] truncate text-small font-semibold md:max-w-[18rem]">
                  <span className="tabular" style={{ color: song.accent }}>
                    {String(song.rank).padStart(2, '0')}
                  </span>{' '}
                  {song.title}
                </p>
                <p className="max-w-[40vw] truncate text-micro text-ash md:max-w-[18rem]">{song.producer}</p>
              </div>
            </GlassSurface>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionPreference>
  )
}
