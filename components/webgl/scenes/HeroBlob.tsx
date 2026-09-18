'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { ShaderMaterial, Vector2, Vector3 } from 'three'
import { accentRgb } from '@/lib/accent'
import { pointer, scrollState, useExperience } from '@/lib/store'
import { color, hexToRgb01 } from '@/lib/tokens'
import { simplex3 } from '../shaders/noise'

const MAX = 24

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * Champ de metaballs 2D (Σ r²/d²), ombré comme du métal liquide :
 * la normale vient du gradient analytique du champ, la couleur d'une
 * « environment map » procédurale dans la palette du site.
 */
const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec3 uBalls[${MAX}];
uniform int uCount;
uniform float uTime;
uniform float uR;
uniform float uIntro;
uniform vec2 uLight;
uniform vec3 uAccent;
uniform vec3 uPink;
uniform vec3 uPaper;
uniform vec3 uVoid;
uniform vec3 uDeep;
${simplex3}

vec3 envMap(vec3 r) {
  float y = r.y;
  vec3 c = mix(uVoid, uDeep, smoothstep(-0.7, -0.05, y));
  c = mix(c, uAccent, smoothstep(-0.1, 0.28, y));
  float stripe = smoothstep(0.30, 0.34, y) * (1.0 - smoothstep(0.42, 0.5, y));
  c = mix(c, uPaper, stripe * 0.9);
  c = mix(c, uAccent * 0.55 + uDeep * 0.4, smoothstep(0.55, 1.0, y));
  c += uPink * smoothstep(0.45, 1.0, r.x) * 0.45;
  return c;
}

void main() {
  vec2 p = vUv * uRes;
  float f = 0.0;
  vec2 g = vec2(0.0);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uCount) break;
    vec3 b = uBalls[i];
    vec2 d = p - b.xy;
    float d2 = dot(d, d) + 1.0;
    float v = b.z * b.z / d2;
    // Noyau (r²/d²)² : plus local que r²/d², les deux traînes restent distinctes.
    f += v * v;
    g += -4.0 * v * v * d / d2;
  }
  f *= uIntro;
  g *= uIntro;
  float aa = fwidth(f) * 1.2 + 1e-4;
  float alpha = smoothstep(1.0 - aa, 1.0 + aa, f);
  if (alpha <= 0.001) discard;

  vec2 gh = g / max(f * f, 1e-4);
  vec3 n = normalize(vec3(-gh * uR * 0.45, 1.0));
  float t = uTime;
  // Légère houle interne : la matière « respire »
  n.xy += vec2(snoise(vec3(p / uR * 0.9, t * 0.35)), snoise(vec3(p / uR * 0.9 + 7.3, t * 0.35))) * 0.06;
  n = normalize(n);

  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 r = reflect(-v, n);
  vec3 col = envMap(r);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);
  col = mix(col, uAccent * 1.15, fres * 0.55);
  vec3 L = normalize(vec3(uLight, 0.9));
  float spec = pow(max(dot(r, L), 0.0), 90.0);
  col += uPaper * spec * 1.3;
  // Liseré sombre : sépare le blob du fond dégradé
  float rim = 1.0 - smoothstep(1.0, 1.22, f);
  col *= 1.0 - rim * 0.35;
  gl_FragColor = vec4(col, alpha);
}
`

type Node = { x: number; y: number; px: number; py: number }

type Props = { track: RefObject<HTMLElement | null>; lite?: boolean }

export default function HeroBlob({ track, lite = false }: Props) {
  const tailLength = lite ? 6 : 9
  const droplets = lite ? 0 : 3

  const { material, u } = useMemo(() => {
    const u = {
      uRes: { value: new Vector2(1, 1) },
      uBalls: { value: Array.from({ length: MAX }, () => new Vector3()) },
      uCount: { value: 0 },
      uTime: { value: 0 },
      uR: { value: 100 },
      uIntro: { value: 0 },
      uLight: { value: new Vector2(-0.4, 0.6) },
      uAccent: { value: new Vector3(...accentRgb()) },
      uPink: { value: new Vector3(...hexToRgb01(color.pink)) },
      uPaper: { value: new Vector3(...hexToRgb01(color.paper)) },
      uVoid: { value: new Vector3(...hexToRgb01(color.void)) },
      uDeep: { value: new Vector3(...hexToRgb01(color.tealDeep)) },
    }
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: u,
    })
    return { material, u }
  }, [])

  useEffect(() => () => material.dispose(), [material])

  const sim = useRef<{
    head: { x: number; y: number; vx: number; vy: number }
    lag: { x: number; y: number }
    tails: Node[][]
    init: boolean
  }>({ head: { x: 0, y: 0, vx: 0, vy: 0 }, lag: { x: 0, y: 0 }, tails: [[], []], init: false })

  useFrame((state, rawDt) => {
    const el = track.current
    if (!el) return
    const dt = Math.min(rawDt, 1 / 30)
    const rect = el.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    const t = state.clock.elapsedTime
    const s = sim.current
    const progress = useExperience.getState().heroProgress
    const loaderDone = useExperience.getState().loaderDone

    const R = Math.min(W, H) * (lite ? 0.13 : 0.11) * (1 - progress * 0.45)

    // Cible : le curseur s'il est au-dessus du hero, sinon une errance lente (Lissajous).
    const localX = pointer.x - rect.left
    const localY = H - (pointer.y - rect.top)
    const pointerInside = pointer.active && localY > 0 && localY < H && performance.now() - pointer.lastMove < 4000
    let tx = W * 0.66 + Math.cos(t * 0.31) * W * 0.16
    let ty = H * 0.52 + Math.sin(t * 0.47) * H * 0.14
    if (pointerInside) {
      tx = localX
      ty = localY
    }
    ty += progress * H * 0.35

    if (!s.init) {
      s.head = { x: tx, y: ty, vx: 0, vy: 0 }
      s.lag = { x: tx, y: ty }
      s.tails = [0, 1].map(() =>
        Array.from({ length: tailLength }, (_, j) => ({ x: tx, y: ty - j * R * 0.4, px: tx, py: ty - j * R * 0.4 })),
      )
      s.init = true
    }

    // Tête : ressort amorti
    const k = pointerInside ? 42 : 12
    const damping = pointerInside ? 9.5 : 5
    s.head.vx += ((tx - s.head.x) * k - s.head.vx * damping) * dt
    s.head.vy += ((ty - s.head.y) * k - s.head.vy * damping) * dt
    s.head.x += s.head.vx * dt
    s.head.y += s.head.vy * dt
    s.lag.x += (s.head.x - s.lag.x) * (1 - Math.exp(-dt * 7))
    s.lag.y += (s.head.y - s.lag.y) * (1 - Math.exp(-dt * 7))

    // Direction de traîne : opposée au mouvement, pendante (gravité) au repos.
    const speed = Math.hypot(s.head.vx, s.head.vy)
    let dirX = -s.head.vx / (speed + 1e-3)
    let dirY = -s.head.vy / (speed + 1e-3)
    const still = 1 - Math.min(1, speed / 400)
    dirX = dirX * (1 - still)
    dirY = dirY * (1 - still) - still
    const dl = Math.hypot(dirX, dirY) || 1
    dirX /= dl
    dirY /= dl
    const perpX = -dirY
    const perpY = dirX

    // Deux traînes (couettes abstraites) en Verlet + contraintes de distance.
    const scrollKick = Math.max(-1, Math.min(1, scrollState.velocity / 40))
    s.tails.forEach((tail, side) => {
      const sgn = side === 0 ? -1 : 1
      const anchorX = s.head.x + perpX * sgn * R * 0.62 + dirX * R * 0.25
      const anchorY = s.head.y + perpY * sgn * R * 0.62 + dirY * R * 0.25
      tail.forEach((node, j) => {
        if (j === 0) {
          node.px = node.x
          node.py = node.y
          node.x = anchorX
          node.y = anchorY
          return
        }
        const vx = (node.x - node.px) * 0.9
        const vy = (node.y - node.py) * 0.9
        node.px = node.x
        node.py = node.y
        const sway = Math.sin(t * 1.9 + j * 0.65 + side * 1.3) * R * 0.018 * j
        node.x += vx + perpX * sway * sgn + scrollKick * R * 0.01 * j * sgn
        node.y += vy - R * 0.012 * (1 + j * 0.2) + scrollKick * R * 0.03
        const prev = tail[j - 1] as Node
        const rest = R * 0.4 * (1 - j * 0.035)
        const dx = node.x - prev.x
        const dy = node.y - prev.y
        const d = Math.hypot(dx, dy) || 1
        node.x = prev.x + (dx / d) * rest
        node.y = prev.y + (dy / d) * rest
      })
    })

    const balls = u.uBalls.value
    let n = 0
    const push = (x: number, y: number, r: number) => {
      if (n < MAX) (balls[n++] as Vector3).set(x, y, r)
    }
    push(s.head.x, s.head.y, R)
    push(s.lag.x, s.lag.y, R * 0.78)
    s.tails.forEach((tail) =>
      tail.forEach((node, j) => push(node.x, node.y, R * Math.max(0.14, 0.5 - j * 0.055))),
    )
    for (let i = 0; i < droplets; i++) {
      const a = t * (0.35 + i * 0.12) + i * 2.1
      push(s.head.x + Math.cos(a) * R * 2.1, s.head.y + Math.sin(a * 1.3) * R * 1.7, R * (0.16 + 0.04 * Math.sin(t + i)))
    }

    u.uCount.value = n
    u.uR.value = R
    u.uRes.value.set(W, H)
    u.uTime.value = t
    const intro = loaderDone ? 1 : 0
    u.uIntro.value += (intro - u.uIntro.value) * (1 - Math.exp(-dt * 2.2))
    u.uLight.value.set(-0.4 + (s.head.x / W - 0.5) * 0.6, 0.6 - (s.head.y / H - 0.5) * 0.4)
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
