'use client'

/**
 * Horloge partagée. SmoothScroll appelle `ticker.run` depuis le ticker GSAP juste
 * APRÈS `lenis.raf` : le canvas R3F rend donc ses vues avec la position de scroll de
 * la frame courante. Sinon, le WebGL « flotte » d'une frame derrière le DOM.
 */
type FrameCallback = (timeSeconds: number) => void

const subscribers = new Set<FrameCallback>()
let lastDriven = 0

export const ticker = {
  add(cb: FrameCallback) {
    subscribers.add(cb)
    return () => {
      subscribers.delete(cb)
    }
  },
  run(timeSeconds: number) {
    lastDriven = performance.now()
    subscribers.forEach((cb) => cb(timeSeconds))
  },
  /** Vrai si le ticker GSAP/Lenis a produit une frame récemment. */
  isDriven() {
    return performance.now() - lastDriven < 120
  },
}
