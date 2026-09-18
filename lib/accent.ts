'use client'

/** hsl → rgb 0..1 */
function hsl(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

/**
 * Accent réellement affiché : teal Miku décalé par l'easter egg (--hue-shift),
 * pour que shaders et CSS restent parfaitement alignés.
 */
export function accentRgb(): [number, number, number] {
  if (typeof document === 'undefined') return [0.2235, 0.7725, 0.7333]
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--hue-shift')
  const shift = parseFloat(raw) || 0
  return hsl((175 + shift + 360) % 360, 0.55, 0.5)
}
