/**
 * Détection du « mode allégé ».
 *
 *  full    → desktop capable : ShaderGradient + scène R3F complète + verre WebGL + post-process
 *  lite    → mobile / machine modeste : DPR réduit, scènes lourdes coupées, verre CSS
 *  none    → pas de WebGL : tout en CSS statique (identique au rendu « reduced »)
 *
 * Le mode effectif combine cette capacité et la préférence de mouvement (voir store.ts).
 * Forçage manuel pour les tests : ?mode=full | lite | reduced
 */
export type Capability = 'full' | 'lite' | 'none'

type NavigatorExtras = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean; effectiveType?: string }
}

export function detectCapability(): Capability {
  if (typeof window === 'undefined') return 'lite'
  const forced = new URLSearchParams(window.location.search).get('mode')
  if (forced === 'full' || forced === 'lite') return forced
  if (!('WebGL2RenderingContext' in window) && !('WebGLRenderingContext' in window)) return 'none'

  const nav = navigator as NavigatorExtras
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.innerWidth < 768
  const saveData = nav.connection?.saveData === true
  const slowNet = /(^|-)2g$/.test(nav.connection?.effectiveType ?? '')
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency < 4

  return coarse || narrow || saveData || slowNet || lowMemory || lowCpu ? 'lite' : 'full'
}

export function forcedReducedFromUrl(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('mode') === 'reduced'
}

export const MOTION_STORAGE_KEY = 'miku:motion'
export const HUE_STORAGE_KEY = 'miku:hue'
export const VISITED_SESSION_KEY = 'miku:visited'
