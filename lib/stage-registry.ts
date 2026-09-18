'use client'

import type { RefObject } from 'react'
import { create } from 'zustand'

/**
 * Registre des « vues » du canvas R3F unique.
 *
 * Les composants DOM déclarent une vue (élément suivi + clé de scène + props) sans
 * importer three.js. Le canvas (chargé à la demande via next/dynamic) lit ce registre
 * et rend une <View> drei par entrée. Un seul contexte WebGL sert donc toutes les
 * scènes du site, et three.js reste hors du bundle initial.
 */
export type SceneKey =
  | 'hero-blob'
  | 'logo-metal'
  | 'card-art'
  | 'constellation'

export type StageEntry = {
  id: string
  scene: SceneKey
  track: RefObject<HTMLElement | null>
  props: Record<string, unknown>
  /** Priorité de rendu drei (ordre des vues). */
  index: number
}

type StageRegistry = {
  entries: Record<string, StageEntry>
  register: (entry: StageEntry) => void
  update: (id: string, props: Record<string, unknown>) => void
  unregister: (id: string) => void
}

export const useStageRegistry = create<StageRegistry>((set) => ({
  entries: {},
  register: (entry) => set((s) => ({ entries: { ...s.entries, [entry.id]: entry } })),
  update: (id, props) =>
    set((s) => {
      const current = s.entries[id]
      if (!current) return s
      return { entries: { ...s.entries, [id]: { ...current, props } } }
    }),
  unregister: (id) =>
    set((s) => {
      if (!(id in s.entries)) return s
      const next = { ...s.entries }
      delete next[id]
      return { entries: next }
    }),
}))
