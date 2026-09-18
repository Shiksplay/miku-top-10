'use client'

import { useEffect, useRef } from 'react'
import { songBySlug } from '@/data/songs'
import { useExperience } from '@/lib/store'

const SITE = 'Miku, en dix morceaux'
const slugFromPath = (path: string) => path.match(/^\/morceau\/([^/?#]+)/)?.[1] ?? null

/**
 * Synchronise la vue détail et l'URL (/morceau/[slug]) sans navigation Next :
 * l'ouverture et la fermeture ne remontent ni le canvas ni la page. Les URL restent
 * partageables (pages SSG) et le bouton « retour » du navigateur ferme le détail.
 */
export function DetailRouter({ initialSlug }: { initialSlug: string | null }) {
  const loaderDone = useExperience((s) => s.loaderDone)
  const openDetail = useExperience((s) => s.openDetail)
  const closeDetail = useExperience((s) => s.closeDetail)
  const pushed = useRef(false)
  const fromUrl = useRef(false)
  const opened = useRef(false)

  useEffect(() => {
    if (!initialSlug || !loaderDone || opened.current) return
    opened.current = true
    fromUrl.current = true
    openDetail(initialSlug)
    fromUrl.current = false
  }, [initialSlug, loaderDone, openDetail])

  useEffect(
    () =>
      useExperience.subscribe((s, prev) => {
        if (s.detailSlug === prev.detailSlug) return
        const song = s.detailSlug ? songBySlug(s.detailSlug) : undefined
        document.title = song ? `${song.title} — ${SITE}` : `${SITE} — le Top 10 Hatsune Miku`
        if (fromUrl.current) return
        const path = s.detailSlug ? `/morceau/${s.detailSlug}` : '/'
        if (window.location.pathname === path) return
        if (s.detailSlug && !prev.detailSlug) {
          window.history.pushState(null, '', path)
          pushed.current = true
        } else if (s.detailSlug) {
          window.history.replaceState(null, '', path)
        } else if (pushed.current) {
          pushed.current = false
          window.history.back()
        } else {
          window.history.replaceState(null, '', '/')
        }
      }),
    [],
  )

  useEffect(() => {
    const onPop = () => {
      const slug = slugFromPath(window.location.pathname)
      const current = useExperience.getState().detailSlug
      fromUrl.current = true
      if (slug && slug !== current && songBySlug(slug)) openDetail(slug)
      else if (!slug && current) {
        pushed.current = false
        closeDetail()
      }
      fromUrl.current = false
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [openDetail, closeDetail])

  return null
}
