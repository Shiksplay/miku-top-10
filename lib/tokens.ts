/**
 * Design tokens — source de vérité côté JS (WebGL, shaders, canvas 2D).
 * Les mêmes valeurs sont exposées en CSS dans app/globals.css (@theme).
 * Toute modification doit être répercutée des deux côtés (voir docs/DESIGN-SYSTEM.md).
 */
export const color = {
  void: '#0B0F0E',
  voidRaised: '#121816',
  paper: '#F4F3F1',
  ash: '#9DA6A4',
  teal: '#39C5BB',
  tealDeep: '#0E3B38',
  pink: '#F0468F',
} as const

export type ColorToken = keyof typeof color

export const motion = {
  /** Courbe « sortie de voix » : attaque rapide, relâche longue. */
  easeVoice: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.65, 0, 0.35, 1] as const,
  durationFast: 0.24,
  durationBase: 0.6,
  durationSlow: 1.2,
} as const

export const breakpoints = {
  md: 768,
  lg: 1024,
  xl: 1440,
} as const

/** Années couvertes par le classement : bornes de la mini piano-roll. */
export const yearSpan = { from: 2007, to: 2024 } as const

export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
