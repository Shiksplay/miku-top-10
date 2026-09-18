import { glassFragment, glassVertex } from './shaders'
import type { Container } from './Container'

/**
 * GlassEngine : UN SEUL contexte WebGL pour toutes les surfaces de verre.
 *
 * Dans la lib d'origine, chaque Container ouvre son propre contexte WebGL et
 * capture tout le <body> une fois pour toutes. Ici :
 *  - un canvas WebGL hors-DOM partagé rend chaque surface, puis le résultat est
 *    copié dans le canvas 2D de la surface (drawImage, même tâche) ;
 *  - couche DOM : capture html2canvas de la zone viewport ± marge, demandée au
 *    scroll-end et au resize (debounce + requestIdleCallback), jamais par frame ;
 *  - couche fixe : copie légère du canvas ShaderGradient (~6 Hz) pour que le verre
 *    reflète le dégradé animé sans relancer html2canvas ;
 *  - seules les surfaces visibles (IntersectionObserver) sont rendues.
 */

type Layer = {
  texture: WebGLTexture
  width: number
  height: number
  /** Origine verticale (coordonnées document) de la capture DOM. */
  originY: number
}

type Rgb = [number, number, number]

const CAPTURE_SCALE = 0.5
const FIXED_SCALE = 0.35
const FIXED_REFRESH_MS = 160
const TINT_TOP: Rgb = [0.165, 0.2, 0.192]
const TINT_BOTTOM: Rgb = [0.043, 0.059, 0.055]

export class GlassEngine {
  private static singleton: GlassEngine | null | undefined

  /** Instance existante, sans en créer une. */
  static peek(): GlassEngine | null {
    return GlassEngine.singleton ?? null
  }

  static get(): GlassEngine | null {
    if (GlassEngine.singleton !== undefined) return GlassEngine.singleton
    try {
      GlassEngine.singleton = new GlassEngine()
    } catch {
      GlassEngine.singleton = null
    }
    return GlassEngine.singleton
  }

  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private loc: Record<string, WebGLUniformLocation | null> = {}
  private domLayer: Layer | null = null
  private fixedLayer: Layer
  private nestedTexture: WebGLTexture
  private fixedCanvas = document.createElement('canvas')
  private thumb = document.createElement('canvas')
  private thumbData: Uint8ClampedArray | null = null
  private instances = new Set<Container>()
  private visible = new WeakSet<Container>()
  private dirty = new Set<Container>()
  private raf = 0
  private io: IntersectionObserver
  private ro: ResizeObserver
  private captureTimer = 0
  private capturing = false
  private captureAgain = false
  private lastScroll = -1
  private fixedTimer = 0
  private lost = false
  accentHighlight: Rgb = [0.22, 0.77, 0.73]

  private constructor() {
    this.canvas = document.createElement('canvas')
    const opts: WebGLContextAttributes = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    }
    const gl = (this.canvas.getContext('webgl2', opts) ?? this.canvas.getContext('webgl', opts)) as WebGLRenderingContext | null
    if (!gl) throw new Error('webgl')
    this.gl = gl
    this.program = this.link()
    gl.useProgram(this.program)

    const quad = (data: number[], name: string) => {
      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
      const l = gl.getAttribLocation(this.program, name)
      gl.enableVertexAttribArray(l)
      gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0)
    }
    quad([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1], 'a_position')
    quad([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0], 'a_texcoord')

    this.fixedLayer = { texture: this.makeTexture(), width: 1, height: 1, originY: 0 }
    this.nestedTexture = this.makeTexture()
    this.drawStaticFallback()

    this.canvas.addEventListener('webglcontextlost', () => {
      this.lost = true
      this.instances.forEach((i) => i.fallbackToCss())
    })

    this.io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const inst = [...this.instances].find((i) => i.element === e.target)
        if (!inst) return
        if (e.isIntersecting) {
          this.visible.add(inst)
          this.requestRender(inst)
        } else this.visible.delete(inst)
      })
      this.updateFixedTimer()
    })
    this.ro = new ResizeObserver((entries) => {
      entries.forEach((e) => {
        const inst = [...this.instances].find((i) => i.element === e.target)
        if (inst) this.requestRender(inst)
      })
    })

    window.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('resize', this.onResize, { passive: true })
  }

  get ready() {
    return !this.lost
  }

  register(inst: Container) {
    this.instances.add(inst)
    this.io.observe(inst.element)
    this.ro.observe(inst.element)
    if (!this.domLayer) this.scheduleCapture(60)
    else this.requestRender(inst)
  }

  unregister(inst: Container) {
    this.instances.delete(inst)
    this.visible.delete(inst)
    this.dirty.delete(inst)
    this.io.unobserve(inst.element)
    this.ro.unobserve(inst.element)
    this.updateFixedTimer()
  }

  requestRender(inst?: Container) {
    if (inst) this.dirty.add(inst)
    else this.instances.forEach((i) => this.dirty.add(i))
    if (!this.raf) this.raf = requestAnimationFrame(this.flush)
  }

  /** Recapture de la couche DOM (contenu qui change : ouverture du détail, etc.). */
  invalidate(delay = 200) {
    this.scheduleCapture(delay)
  }

  private flush = () => {
    this.raf = 0
    if (this.lost) return
    const list = [...this.dirty]
    this.dirty.clear()
    list.forEach((inst) => {
      if (this.visible.has(inst) || inst.parent) this.renderInstance(inst)
    })
    // Les surfaces imbriquées lisent le rendu de leur parent : on les rend après lui.
    list.forEach((inst) => inst.children.forEach((c) => this.visible.has(c) && this.renderInstance(c)))
  }

  private onScroll = () => {
    this.requestRender()
    const y = window.scrollY
    if (this.lastScroll < 0) this.lastScroll = y
    // La capture couvre le viewport ± 0,75 écran : inutile de relancer html2canvas
    // tant que le défilement reste dans cette marge.
    if (Math.abs(y - this.lastScroll) > window.innerHeight * 0.3) this.scheduleCapture(220)
  }

  private onResize = () => {
    this.domLayer = null
    this.scheduleCapture(300)
    this.requestRender()
  }

  private updateFixedTimer() {
    const any = [...this.instances].some((i) => this.visible.has(i))
    if (any && !this.fixedTimer) {
      this.fixedTimer = window.setInterval(() => {
        if (document.hidden) return
        if (this.refreshFixedLayer()) this.requestRender()
      }, FIXED_REFRESH_MS)
      this.refreshFixedLayer()
    } else if (!any && this.fixedTimer) {
      window.clearInterval(this.fixedTimer)
      this.fixedTimer = 0
    }
  }

  /** Copie légère du fond ShaderGradient (nécessite preserveDrawingBuffer côté fond). */
  private refreshFixedLayer(): boolean {
    const source = document.querySelector<HTMLCanvasElement>('.layer-backdrop canvas')
    const w = Math.max(1, Math.round(window.innerWidth * FIXED_SCALE))
    const h = Math.max(1, Math.round(window.innerHeight * FIXED_SCALE))
    const ctx = this.fixedCanvas.getContext('2d')
    if (!ctx) return false
    if (this.fixedCanvas.width !== w || this.fixedCanvas.height !== h) {
      this.fixedCanvas.width = w
      this.fixedCanvas.height = h
    }
    const backdropVisible = source && parseFloat(getComputedStyle(source.closest('.layer-backdrop') as Element).opacity || '1') > 0.5
    if (source && source.width > 0 && backdropVisible) {
      try {
        ctx.drawImage(source, 0, 0, w, h)
      } catch {
        this.paintStatic(ctx, w, h)
      }
    } else {
      this.paintStatic(ctx, w, h)
    }
    this.upload(this.fixedLayer.texture, this.fixedCanvas)
    this.fixedLayer.width = window.innerWidth
    this.fixedLayer.height = window.innerHeight
    this.sampleThumb()
    return true
  }

  private drawStaticFallback() {
    const w = Math.max(1, Math.round(window.innerWidth * FIXED_SCALE))
    const h = Math.max(1, Math.round(window.innerHeight * FIXED_SCALE))
    this.fixedCanvas.width = w
    this.fixedCanvas.height = h
    const ctx = this.fixedCanvas.getContext('2d')
    if (!ctx) return
    this.paintStatic(ctx, w, h)
    this.upload(this.fixedLayer.texture, this.fixedCanvas)
    this.fixedLayer.width = window.innerWidth
    this.fixedLayer.height = window.innerHeight
    this.sampleThumb()
  }

  /** Reproduit .layer-static (globals.css) quand le fond WebGL n'est pas disponible. */
  private paintStatic(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#0B0F0E'
    ctx.fillRect(0, 0, w, h)
    const m = Math.max(w, h)
    const blob = (x: number, y: number, r: number, c: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, c)
      g.addColorStop(1, 'rgba(11,15,14,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    blob(w * 0.78, h * 0.18, m * 0.55, 'rgba(57,197,187,0.34)')
    blob(w * 0.12, h * 0.88, m * 0.5, 'rgba(14,59,56,0.9)')
    blob(w * 0.6, h * 0.7, m * 0.28, 'rgba(240,70,143,0.1)')
  }

  private sampleThumb() {
    const tctx = this.thumb.getContext('2d', { willReadFrequently: true })
    if (!tctx) return
    this.thumb.width = 48
    this.thumb.height = 32
    tctx.drawImage(this.fixedCanvas, 0, 0, 48, 32)
    this.thumbData = tctx.getImageData(0, 0, 48, 32).data
  }

  /** Équivalent CPU de la boucle « Sampled gradient » de l'original. */
  private bandColor(viewportY: number): Rgb {
    const data = this.thumbData
    if (!data) return TINT_BOTTOM
    const row = Math.min(31, Math.max(0, Math.round((viewportY / window.innerHeight) * 31)))
    let r = 0
    let g = 0
    let b = 0
    for (let x = 0; x < 48; x += 2) {
      const i = (row * 48 + x) * 4
      r += data[i] ?? 0
      g += data[i + 1] ?? 0
      b += data[i + 2] ?? 0
    }
    const n = 24 * 255
    return [r / n, g / n, b / n]
  }

  private scheduleCapture(delay: number) {
    window.clearTimeout(this.captureTimer)
    this.captureTimer = window.setTimeout(() => {
      const run = () => void this.capture()
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 600 })
      else run()
    }, delay)
  }

  private async capture() {
    if (this.lost || this.instances.size === 0) return
    if (this.capturing) {
      this.captureAgain = true
      return
    }
    this.capturing = true
    try {
      const { default: html2canvas } = await import('html2canvas-pro')
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight
      const margin = Math.round(vh * 0.75)
      const scrollY = window.scrollY
      const docH = document.documentElement.scrollHeight
      const y = Math.max(0, Math.round(scrollY - margin))
      const height = Math.max(1, Math.min(docH - y, vh + margin * 2))
      const detail = document.documentElement.dataset.stage === 'detail'
      const snapshot = await html2canvas(document.body, {
        x: 0,
        y,
        width: vw,
        height,
        windowWidth: vw,
        windowHeight: vh,
        scale: CAPTURE_SCALE,
        backgroundColor: null,
        logging: false,
        useCORS: true,
        ignoreElements: (el: Element) =>
          el.classList.contains('glass') ||
          el.classList.contains('layer-static') ||
          el.classList.contains('layer-backdrop') ||
          el.classList.contains('layer-stage') ||
          el.classList.contains('loader') ||
          el.hasAttribute('data-glass-ignore') ||
          // En vue détail, la page est masquée par les couches WebGL : on ne la capture pas.
          (detail && el.hasAttribute('data-page-content')),
      })
      if (!this.domLayer) this.domLayer = { texture: this.makeTexture(), width: 1, height: 1, originY: 0 }
      this.upload(this.domLayer.texture, snapshot)
      this.domLayer.width = vw
      this.domLayer.height = height
      this.domLayer.originY = y
      this.lastScroll = scrollY
      this.refreshFixedLayer()
      this.requestRender()
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[liquid-glass] capture impossible', err)
      if (!this.domLayer) this.instances.forEach((i) => i.fallbackToCss())
    } finally {
      this.capturing = false
      if (this.captureAgain) {
        this.captureAgain = false
        this.scheduleCapture(120)
      }
    }
  }

  private renderInstance(inst: Container) {
    const gl = this.gl
    if (!this.domLayer && !inst.parent) return
    const rect = inst.element.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = Math.min(2048, Math.ceil(rect.width * dpr))
    const h = Math.min(2048, Math.ceil(rect.height * dpr))
    if (this.canvas.width < w || this.canvas.height < h) {
      this.canvas.width = Math.max(this.canvas.width, w)
      this.canvas.height = Math.max(this.canvas.height, h)
    }
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const p = { ...glassControls, ...inst.params }
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const radius =
      inst.type === 'circle' ? Math.min(rect.width, rect.height) / 2 : inst.type === 'pill' ? rect.height / 2 : inst.borderRadius

    const parent = inst.parent
    if (parent && parent.canvas.width > 0) {
      const pr = parent.element.getBoundingClientRect()
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.nestedTexture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, parent.canvas)
      this.u2('u_textureSize', pr.width, pr.height)
      this.u2('u_containerPosition', cx - pr.left, cy - pr.top)
      this.u1('u_nested', 1)
    } else if (this.domLayer) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.domLayer.texture)
      this.u2('u_textureSize', this.domLayer.width, this.domLayer.height)
      this.u2('u_containerPosition', cx, cy + window.scrollY - this.domLayer.originY)
      this.u1('u_nested', 0)
    }
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.fixedLayer.texture)
    this.u1i('u_image', 0)
    this.u1i('u_fixed', 1)
    this.u2('u_viewport', this.fixedLayer.width, this.fixedLayer.height)
    this.u2('u_viewportPosition', cx, cy)
    this.u2('u_resolution', rect.width, rect.height)
    this.u1('u_borderRadius', Math.min(radius, Math.min(rect.width, rect.height) / 2))
    this.u1('u_shape', inst.type === 'pill' ? 2 : inst.type === 'circle' ? 1 : 0)
    this.u1('u_warp', inst.warp ? 1 : 0)
    this.u1('u_blurRadius', p.blurRadius)
    this.u1('u_edgeIntensity', p.edgeIntensity)
    this.u1('u_rimIntensity', p.rimIntensity)
    this.u1('u_baseIntensity', p.baseIntensity)
    this.u1('u_edgeDistance', p.edgeDistance)
    this.u1('u_rimDistance', p.rimDistance)
    this.u1('u_baseDistance', p.baseDistance)
    this.u1('u_cornerBoost', p.cornerBoost)
    this.u1('u_rippleEffect', p.rippleEffect)
    this.u1('u_tintOpacity', inst.tintOpacity)
    this.u1('u_refraction', p.refraction)
    this.u1('u_darken', p.darken)
    this.u1('u_highlight', inst.highlight)
    this.u3('u_highlightColor', inst.highlightColor ?? this.accentHighlight)
    this.u3('u_topColor', this.bandColor(cy - rect.height * 0.4))
    this.u3('u_midColor', this.bandColor(cy))
    this.u3('u_bottomColor', this.bandColor(cy + rect.height * 0.4))
    this.u3('u_tintTop', TINT_TOP)
    this.u3('u_tintBottom', TINT_BOTTOM)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    inst.present(this.canvas, w, h)
  }

  private makeTexture(): WebGLTexture {
    const gl = this.gl
    const t = gl.createTexture()
    if (!t) throw new Error('texture')
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([11, 15, 14, 255]))
    return t
  }

  private upload(texture: WebGLTexture, source: TexImageSource) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  }

  private uniform(name: string) {
    if (!(name in this.loc)) this.loc[name] = this.gl.getUniformLocation(this.program, name)
    return this.loc[name] ?? null
  }
  private u1(n: string, v: number) {
    this.gl.uniform1f(this.uniform(n), v)
  }
  private u1i(n: string, v: number) {
    this.gl.uniform1i(this.uniform(n), v)
  }
  private u2(n: string, a: number, b: number) {
    this.gl.uniform2f(this.uniform(n), a, b)
  }
  private u3(n: string, v: Rgb) {
    this.gl.uniform3f(this.uniform(n), v[0], v[1], v[2])
  }

  private link(): WebGLProgram {
    const gl = this.gl
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) throw new Error('shader')
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'compile')
      return s
    }
    const program = gl.createProgram()
    if (!program) throw new Error('program')
    gl.attachShader(program, compile(gl.VERTEX_SHADER, glassVertex))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, glassFragment))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link')
    return program
  }
}

/**
 * Paramètres globaux, équivalent de `window.glassControls` dans la lib d'origine.
 * Surchargeables par instance via `params`.
 */
export type GlassParams = {
  edgeIntensity: number
  rimIntensity: number
  baseIntensity: number
  edgeDistance: number
  rimDistance: number
  baseDistance: number
  cornerBoost: number
  rippleEffect: number
  blurRadius: number
  /** Ajout : amplitude de la réfraction en px (la lib la liait à la taille de la page). */
  refraction: number
  /** Ajout : assombrissement pour garantir le contraste du texte (AA). */
  darken: number
}

export const glassControls: GlassParams = {
  edgeIntensity: 0.01,
  rimIntensity: 0.05,
  baseIntensity: 0.01,
  edgeDistance: 0.15,
  rimDistance: 0.8,
  baseDistance: 0.1,
  cornerBoost: 0.02,
  rippleEffect: 0.1,
  blurRadius: 5,
  refraction: 520,
  darken: 0.35,
}
