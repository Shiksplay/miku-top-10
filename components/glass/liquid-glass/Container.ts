import { GlassEngine, type GlassParams } from './engine'

export type GlassType = 'rounded' | 'circle' | 'pill'

export type ContainerOptions = {
  /** Élément existant (géré par React), au lieu de la <div> créée par la lib d'origine. */
  element: HTMLElement
  borderRadius?: number
  type?: GlassType
  tintOpacity?: number
  params?: Partial<GlassParams>
}

/**
 * Port TypeScript de la classe Container de dashersw/liquid-glass-js.
 * API conservée : borderRadius, type ('rounded' | 'circle' | 'pill'), tintOpacity,
 * addChild / removeChild, updateSizeFromDOM, Container.instances.
 * Différences : on s'attache à un élément existant (sémantique HTML et accessibilité
 * restent du côté de React), le rendu est mutualisé par GlassEngine, et destroy()
 * libère tout (la lib d'origine ne nettoyait ni écouteurs ni instances).
 */
export class Container {
  static instances: Container[] = []

  element: HTMLElement
  canvas: HTMLCanvasElement
  borderRadius: number
  type: GlassType
  tintOpacity: number
  params: Partial<GlassParams>
  warp = false
  children: Container[] = []
  parent: Container | null = null
  /** 0..1 : intensité du halo (survol / focus). */
  highlight = 0
  highlightColor: [number, number, number] | null = null
  webglInitialized = false
  protected ctx: CanvasRenderingContext2D | null
  protected engine: GlassEngine | null

  constructor(options: ContainerOptions) {
    this.element = options.element
    this.borderRadius = options.borderRadius ?? 48
    this.type = options.type ?? 'rounded'
    this.tintOpacity = options.tintOpacity ?? 0.2
    this.params = options.params ?? {}

    this.canvas = document.createElement('canvas')
    this.canvas.className = 'glass-canvas'
    this.canvas.setAttribute('aria-hidden', 'true')
    this.ctx = this.canvas.getContext('2d')
    this.element.prepend(this.canvas)

    Container.instances.push(this)
    this.engine = GlassEngine.get()
    if (!this.engine || !this.ctx) {
      this.fallbackToCss()
      return
    }
    this.engine.register(this)
  }

  addChild(child: Container) {
    this.children.push(child)
    child.parent = this
    this.updateSizeFromDOM()
    return child
  }

  removeChild(child: Container) {
    const i = this.children.indexOf(child)
    if (i > -1) {
      this.children.splice(i, 1)
      child.parent = null
      this.updateSizeFromDOM()
    }
  }

  updateSizeFromDOM() {
    this.render()
  }

  render() {
    this.engine?.requestRender(this)
  }

  /** Appelé par le moteur : copie la zone rendue dans le canvas 2D de la surface. */
  present(source: HTMLCanvasElement, w: number, h: number) {
    const ctx = this.ctx
    if (!ctx) return
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(source, 0, source.height - h, w, h, 0, 0, w, h)
    if (!this.webglInitialized) {
      this.webglInitialized = true
      this.element.dataset.glass = 'webgl'
    }
  }

  fallbackToCss() {
    this.element.dataset.glass = 'css'
    this.canvas.remove()
  }

  destroy() {
    this.engine?.unregister(this)
    this.children.forEach((c) => (c.parent = null))
    this.parent?.removeChild(this)
    this.canvas.remove()
    this.element.dataset.glass = 'css'
    Container.instances = Container.instances.filter((i) => i !== this)
  }
}
