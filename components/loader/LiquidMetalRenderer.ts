import {
  drawLogoMask,
  liquidMetalChunk,
  liquidMetalDefaults,
  paletteUniforms,
} from '@/components/webgl/shaders/liquidMetal'

const vertex = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
${liquidMetalChunk}
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 c = liquidMetal(uv, uResolution);
  gl_FragColor = vec4(c.rgb * c.a, c.a);
}
`

/**
 * Canvas WebGL autonome (sans three.js) dédié à l'écran de chargement.
 * Il est détruit, et son contexte explicitement perdu, dès la fin du chargement :
 * il ne s'ajoute jamais durablement au budget de contextes WebGL.
 */
export class LiquidMetalRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private uniforms = new Map<string, WebGLUniformLocation | null>()
  private raf = 0
  private start = performance.now()
  private texture: WebGLTexture | null = null
  reveal = 0
  pointer: [number, number] = [0, 0]
  animate = true

  static create(canvas: HTMLCanvasElement): LiquidMetalRenderer | null {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    })
    if (!gl) return null
    try {
      return new LiquidMetalRenderer(canvas, gl)
    } catch {
      return null
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
  ) {
    this.gl = gl
    this.program = this.link(vertex, fragment)
    gl.useProgram(this.program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(this.program, 'aPosition')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const d = liquidMetalDefaults
    this.set1('uSpeed', d.uSpeed)
    this.set1('uIterations', d.uIterations)
    this.set1('uScale', d.uScale)
    this.set1('uDotFactor', d.uDotFactor)
    this.set1('uDotMultiplier', d.uDotMultiplier)
    this.set1('uVOffset', d.uVOffset)
    this.set1('uIntensityFactor', d.uIntensityFactor)
    this.set1('uExpFactor', d.uExpFactor)
    this.set3('uColorFactors', d.uColorFactors)
    this.set1('uColorShift', d.uColorShift)
    this.set1('uNoiseIntensity', d.uNoiseIntensity)
    this.set1('uInteract', d.uInteract)
    this.set1('uThemeMix', d.uThemeMix)
    const pal = paletteUniforms()
    this.set3('uVoid', pal.uVoid)
    this.set3('uDeep', pal.uDeep)
    this.set3('uTeal', pal.uTeal)
    this.set3('uPaper', pal.uPaper)
    this.set3('uPink', pal.uPink)
    this.uploadLogo()
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  }

  /** À rappeler une fois la police d'affichage chargée. */
  uploadLogo() {
    const gl = this.gl
    const mask = drawLogoMask(512)
    if (!this.texture) this.texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask)
    this.set1i('uLogo', 0)
    this.set2('uLogoTexel', [1 / mask.width, 1 / mask.height])
  }

  run() {
    const loop = () => {
      this.draw()
      if (this.animate) this.raf = requestAnimationFrame(loop)
    }
    loop()
  }

  draw() {
    const gl = this.gl
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(this.canvas.clientWidth * dpr)
    const h = Math.round(this.canvas.clientHeight * dpr)
    if (w === 0 || h === 0) return
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.set2('uResolution', [w, h])
    this.set1('uTime', (performance.now() - this.start) / 1000)
    this.set1('uReveal', this.reveal)
    this.set2('uPointer', this.pointer)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  private loc(name: string) {
    if (!this.uniforms.has(name)) this.uniforms.set(name, this.gl.getUniformLocation(this.program, name))
    return this.uniforms.get(name) ?? null
  }
  private set1(n: string, v: number) {
    this.gl.uniform1f(this.loc(n), v)
  }
  private set1i(n: string, v: number) {
    this.gl.uniform1i(this.loc(n), v)
  }
  private set2(n: string, v: [number, number]) {
    this.gl.uniform2f(this.loc(n), v[0], v[1])
  }
  private set3(n: string, v: [number, number, number]) {
    this.gl.uniform3f(this.loc(n), v[0], v[1], v[2])
  }

  private link(vs: string, fs: string): WebGLProgram {
    const gl = this.gl
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) throw new Error('shader')
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) ?? 'compile')
      }
      return s
    }
    const program = gl.createProgram()
    if (!program) throw new Error('program')
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'link')
    }
    return program
  }
}
