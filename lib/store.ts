'use client'

import { create } from 'zustand'
import type { Capability } from './capability'

export type Mode = 'full' | 'lite' | 'reduced'

type ExperienceState = {
  capability: Capability
  reducedMotion: boolean
  /** Mode effectif : 'reduced' l'emporte, 'none' se comporte comme 'reduced'. */
  mode: Mode
  hydrated: boolean
  loaderDone: boolean
  /** Les chunks WebGL (fond + scène) ont été demandés. */
  webglRequested: boolean
  backdropReady: boolean
  stageReady: boolean
  activeSlug: string | null
  hoveredSlug: string | null
  detailSlug: string | null
  /** Morceau affiché par les couches WebGL : reste actif pendant l'animation de fermeture. */
  stageSlug: string | null
  heroProgress: number
  setCapability: (c: Capability) => void
  setReducedMotion: (r: boolean) => void
  setHydrated: () => void
  setLoaderDone: () => void
  requestWebgl: () => void
  setBackdropReady: () => void
  setStageReady: () => void
  setActive: (slug: string | null) => void
  setHovered: (slug: string | null) => void
  openDetail: (slug: string) => void
  closeDetail: () => void
  releaseStage: () => void
  setHeroProgress: (p: number) => void
}

const resolveMode = (capability: Capability, reduced: boolean): Mode =>
  reduced || capability === 'none' ? 'reduced' : capability

export const useExperience = create<ExperienceState>((set, get) => ({
  capability: 'lite',
  reducedMotion: false,
  mode: 'lite',
  hydrated: false,
  loaderDone: false,
  webglRequested: false,
  backdropReady: false,
  stageReady: false,
  activeSlug: null,
  hoveredSlug: null,
  detailSlug: null,
  stageSlug: null,
  heroProgress: 0,
  setCapability: (capability) => set({ capability, mode: resolveMode(capability, get().reducedMotion) }),
  setReducedMotion: (reducedMotion) =>
    set({ reducedMotion, mode: resolveMode(get().capability, reducedMotion) }),
  setHydrated: () => set({ hydrated: true }),
  setLoaderDone: () => set({ loaderDone: true }),
  requestWebgl: () => set({ webglRequested: true }),
  setBackdropReady: () => set({ backdropReady: true }),
  setStageReady: () => set({ stageReady: true }),
  setActive: (activeSlug) => set({ activeSlug }),
  setHovered: (hoveredSlug) => set({ hoveredSlug }),
  openDetail: (detailSlug) => set({ detailSlug, stageSlug: detailSlug, hoveredSlug: null }),
  closeDetail: () => set({ detailSlug: null }),
  releaseStage: () => set((s) => (s.detailSlug ? s : { stageSlug: null })),
  setHeroProgress: (heroProgress) => set({ heroProgress }),
}))

/** Pointeur global normalisé (lu dans les boucles rAF sans provoquer de rendu React). */
export const pointer = {
  x: 0,
  y: 0,
  /** Vitesse lissée en px/frame. */
  vx: 0,
  vy: 0,
  active: false,
  lastMove: 0,
}

/** Défilement global (écrit par SmoothScroll, lu par les shaders et le verre liquide). */
export const scrollState = {
  y: 0,
  velocity: 0,
}
