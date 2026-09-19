'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  LinearFilter,
  Mesh,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three'
import { accentRgb } from '@/lib/accent'
import { pointer, scrollState, useExperience } from '@/lib/store'
import { liquidMetalChunk, liquidMetalDefaults, paletteUniforms } from '../shaders/liquidMetal'

/**
 * Blob du hero : une tête et deux traînes (couettes abstraites), en métal liquide.
 *
 * Choix documenté (exploration comparée sur captures headless, GPU intégré) :
 * - Avant : champ de metaballs (tête + deux chaînes de billes) ombré par une env-map simple.
 *   Défauts constatés : traînes en chapelet de perles, bosses dans la tête, petit artefact au
 *   centre de chaque bille, bandeau blanc dentelé qui salissait le titre inversé.
 * - (c) Silhouette seule : chaque traîne devient une mèche continue (capsules inégales
 *   exactes, union lisse avec la tête) et le Verlet gagne une raideur en flexion. Cela suffit
 *   à supprimer l'aspect grumeleux, mais l'env-map restait plastique et facettée.
 *   → Retenue comme géométrie.
 * - (b) Verre (réfraction du fond façon liquid-glass + liseré) : le fond est un dégradé lisse,
 *   la réfraction n'y déforme presque rien et le blob perd son contraste de luminance. Le titre
 *   en `mix-blend-mode: difference` ne s'inversait presque plus. → Écartée.
 * - (a) Métal liquide du logo : la silhouette (c) est rendue en masque doux hors-écran
 *   (FBO demi-résolution, dans cette même View, sans second canvas), puis passe par
 *   `liquidMetal()`, la fonction exacte du loader et du logo « 39 » (contours, champ
 *   vectoriel, compression tanh/exp, reflets). → Retenue comme matière.
 *
 * Réglages propres au blob (le logo garde les siens) : repère local `LM_FRAME` (le motif suit
 * la tête), chute radiale et turbulence de bord adoucies (sinon les traînes noircissent et
 * leurs bords « froissent »), grain `LM_GRAIN` réduit, facteurs de couleur verticaux atténués
 * (sinon les pointes virent au magenta), plus un liseré et un reflet tirés du gradient du masque.
 *
 * Contraste : le métal alterne zones sombres, teal saturé et reflets papier. Sous le titre en
 * « difference », les lettres passent au cramoisi (complémentaire du teal) ou au noir, jamais
 * à un gris moyen illisible.
 * Perf : une passe masque demi-résolution (SDF d'une vingtaine de primitives), puis une passe
 * métal où seuls les pixels du blob exécutent la boucle ; ailleurs, un texel lu puis discard.
 */

const MAX_TAIL = 9
const MAX_DROPS = 3

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Passe 1 : silhouette en SDF → masque doux (blanc, alpha = rampe lissée autour du bord). */
const maskFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uView;
uniform vec3 uHead;
uniform vec3 uLag;
uniform vec3 uTail[${MAX_TAIL * 2}];
uniform int uTailLen;
uniform vec3 uDrops[${MAX_DROPS}];
uniform int uDropCount;
uniform float uNeck;
uniform float uSoft;

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
// Capsule inégale exacte (Inigo Quilez, MIT) : raccords tangents, sans arête.
float cone(vec2 p, vec3 a, vec3 b) {
  p -= a.xy;
  vec2 pb = b.xy - a.xy;
  float h = dot(pb, pb);
  float dr = a.z - b.z;
  if (h <= dr * dr + 1e-3) return min(length(p) - a.z, length(p - pb) - b.z);
  vec2 q = vec2(dot(p, vec2(pb.y, -pb.x)), dot(p, pb)) / h;
  q.x = abs(q.x);
  vec2 c = vec2(sqrt(h - dr * dr), dr);
  float k = c.x * q.y - c.y * q.x;
  if (k < 0.0) return sqrt(h * dot(q, q)) - a.z;
  if (k > c.x) return sqrt(h * (dot(q, q) + 1.0 - 2.0 * q.y)) - b.z;
  return dot(c, q) - a.z;
}
void main() {
  vec2 p = vUv * uView;
  // Corps en goutte : la tête et sa masse en retard, étirée dans le mouvement.
  float d = cone(p, uLag, uHead);
  // Traînes : union franche entre segments (un lissage ici ferait une bosse à chaque nœud).
  float t0 = 1e5;
  float t1 = 1e5;
  for (int j = 0; j < ${MAX_TAIL - 1}; j++) {
    if (j >= uTailLen - 1) break;
    t0 = min(t0, cone(p, uTail[j], uTail[j + 1]));
    t1 = min(t1, cone(p, uTail[j + ${MAX_TAIL}], uTail[j + ${MAX_TAIL + 1}]));
  }
  d = smin(d, t0, uNeck);
  d = smin(d, t1, uNeck);
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropCount) break;
    d = smin(d, length(p - uDrops[i].xy) - uDrops[i].z, uNeck * 0.3);
  }
  float m = 1.0 - smoothstep(-uSoft, uSoft, d);
  gl_FragColor = vec4(vec3(1.0), m);
}
`

/** Passe 2 : métal liquide du logo sur le masque, bord net + volume tiré du gradient du masque. */
const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uLight;
uniform float uSpread;
uniform float uGradScale;
${liquidMetalChunk}

// Normale « en dôme » : gradient de Sobel du masque (isotrope, pas de croix sur les gouttes).
vec3 maskNormal(vec2 uv, float m, out float s) {
  vec2 e = uLogoTexel * uSpread;
  float r = texture2D(uLogo, uv + vec2(e.x, 0.0)).a;
  float l = texture2D(uLogo, uv - vec2(e.x, 0.0)).a;
  float t = texture2D(uLogo, uv + vec2(0.0, e.y)).a;
  float b = texture2D(uLogo, uv - vec2(0.0, e.y)).a;
  float tr = texture2D(uLogo, uv + e).a;
  float bl = texture2D(uLogo, uv - e).a;
  float tl = texture2D(uLogo, uv + vec2(-e.x, e.y)).a;
  float br = texture2D(uLogo, uv + vec2(e.x, -e.y)).a;
  vec2 g = vec2(2.0 * (r - l) + (tr - tl) + (br - bl), 2.0 * (t - b) + (tr - br) + (tl - bl));
  g *= 0.25 * uGradScale;
  s = clamp(m * 2.0 - 1.0, 0.0, 1.0);
  float k = 1.0 - s;
  float slope = k / sqrt(max(1.0 - k * k, 0.03));
  return normalize(vec3(-g * slope * 0.9, 1.0));
}

void main() {
  float m = texture2D(uLogo, vUv).a;
  // Bord net malgré un masque demi-résolution : seuil à 0,5 antialiasé (comme un texte SDF).
  float aa = fwidth(m) * 0.75 + 1e-4;
  float alpha = smoothstep(0.5 - aa, 0.5 + aa, m);
  if (alpha <= 0.001) discard;

  vec3 col = liquidMetal(vUv, uResolution).rgb;
  float s;
  vec3 n = maskNormal(vUv, m, s);
  // Volume : bord assombri puis liseré clair, reflet humide orienté par la lumière.
  col *= mix(1.0, 0.55, pow(1.0 - s, 2.0));
  col += mix(uPaper, uTeal, 0.35) * pow(1.0 - s, 5.0) * 0.55;
  vec3 refl = reflect(vec3(0.0, 0.0, -1.0), n);
  vec3 L = normalize(vec3(uLight, 0.9));
  col += uPaper * pow(max(dot(refl, L), 0.0), 40.0) * 0.8;
  gl_FragColor = vec4(col, alpha);
}
`

type Node = { x: number; y: number; px: number; py: number }

type Props = { track: RefObject<HTMLElement | null>; lite?: boolean }

export default function HeroBlob({ track, lite = false }: Props) {
  // MODE ALLÉGÉ : traînes plus courtes, aucune gouttelette, masque au tiers de la résolution.
  const tailLength = lite ? 6 : 9
  const droplets = lite ? 0 : 3
  const maskScale = lite ? 0.34 : 0.5

  const mask = useMemo(() => {
    const target = new WebGLRenderTarget(2, 2, {
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
    })
    const u = {
      uView: { value: new Vector2(1, 1) },
      uHead: { value: new Vector3() },
      uLag: { value: new Vector3() },
      uTail: { value: Array.from({ length: MAX_TAIL * 2 }, () => new Vector3()) },
      uTailLen: { value: 0 },
      uDrops: { value: Array.from({ length: MAX_DROPS }, () => new Vector3()) },
      uDropCount: { value: 0 },
      uNeck: { value: 1 },
      uSoft: { value: 1 },
    }
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: maskFragment,
      uniforms: u,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })
    const geometry = new PlaneGeometry(2, 2)
    const scene = new Scene()
    const quad = new Mesh(geometry, material)
    quad.frustumCulled = false
    scene.add(quad)
    return { target, u, material, geometry, scene, camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1) }
  }, [])

  const { material, u } = useMemo(() => {
    const d = liquidMetalDefaults
    const pal = paletteUniforms()
    const u = {
      uLogo: { value: mask.target.texture },
      uLogoTexel: { value: new Vector2(1, 1) },
      uResolution: { value: new Vector2(1, 1) },
      uFrame: { value: new Vector3(0, 0, 100) },
      uLight: { value: new Vector2(-0.4, 0.6) },
      uSpread: { value: 2 },
      uGradScale: { value: 1 },
      uTime: { value: 0 },
      uSpeed: { value: d.uSpeed },
      uIterations: { value: d.uIterations },
      uScale: { value: d.uScale },
      uDotFactor: { value: d.uDotFactor },
      uVOffset: { value: d.uVOffset },
      uIntensityFactor: { value: d.uIntensityFactor },
      uColorShift: { value: d.uColorShift },
      uNoiseIntensity: { value: d.uNoiseIntensity },
      uThemeMix: { value: d.uThemeMix },
      // Réglages propres au blob (voir en tête de fichier)
      uDotMultiplier: { value: 0.15 },
      uExpFactor: { value: 1.6 },
      uColorFactors: { value: new Vector3(-0.5, 0.25, 0.25) },
      uInteract: { value: 0.12 },
      uVoid: { value: new Vector3(...pal.uVoid) },
      uDeep: { value: new Vector3(...pal.uDeep) },
      // Accent effectif (décalage de teinte de l'easter egg), comme le reste des shaders.
      uTeal: { value: new Vector3(...accentRgb()) },
      uPaper: { value: new Vector3(...pal.uPaper) },
      uPink: { value: new Vector3(...pal.uPink) },
      uReveal: { value: 1 },
      uPointer: { value: new Vector2() },
    }
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      defines: { LM_FRAME: '', LM_GRAIN: '0.035' },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: u,
    })
    return { material, u }
  }, [mask])

  useEffect(
    () => () => {
      material.dispose()
      mask.material.dispose()
      mask.geometry.dispose()
      mask.target.dispose()
    },
    [material, mask],
  )

  const sim = useRef<{
    head: { x: number; y: number; vx: number; vy: number }
    lag: { x: number; y: number }
    tails: Node[][]
    intro: number
    init: boolean
  }>({ head: { x: 0, y: 0, vx: 0, vy: 0 }, lag: { x: 0, y: 0 }, tails: [[], []], intro: 0, init: false })

  useFrame((state, rawDt) => {
    const el = track.current
    if (!el) return
    const dt = Math.min(rawDt, 1 / 30)
    const rect = el.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    const t = state.clock.elapsedTime
    const s = sim.current
    const { heroProgress: progress, loaderDone } = useExperience.getState()

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
      s.tails = [-1, 1].map((sgn) =>
        Array.from({ length: tailLength }, (_, j) => {
          const x = tx + sgn * R * (0.8 + j * 0.08)
          const y = ty - j * R * 0.4
          return { x, y, px: x, py: y }
        }),
      )
      s.init = true
    }

    // Tête : ressort amorti. La masse en retard étire le corps en goutte (bornée à 1,5 R).
    const k = pointerInside ? 42 : 12
    const damping = pointerInside ? 9.5 : 5
    s.head.vx += ((tx - s.head.x) * k - s.head.vx * damping) * dt
    s.head.vy += ((ty - s.head.y) * k - s.head.vy * damping) * dt
    s.head.x += s.head.vx * dt
    s.head.y += s.head.vy * dt
    s.lag.x += (s.head.x - s.lag.x) * (1 - Math.exp(-dt * 7))
    s.lag.y += (s.head.y - s.lag.y) * (1 - Math.exp(-dt * 7))
    const lagD = Math.hypot(s.lag.x - s.head.x, s.lag.y - s.head.y)
    if (lagD > R * 1.5) {
      s.lag.x = s.head.x + ((s.lag.x - s.head.x) / lagD) * R * 1.5
      s.lag.y = s.head.y + ((s.lag.y - s.head.y) / lagD) * R * 1.5
    }

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

    // Deux traînes (couettes abstraites) en Verlet : racines sur le haut des côtés de la tête,
    // contraintes de distance, raideur en flexion, légère ouverture vers l'extérieur.
    const scrollKick = Math.max(-1, Math.min(1, scrollState.velocity / 40))
    const n = tailLength
    const radius = (j: number) => R * (0.34 - (0.24 * j) / Math.max(1, n - 1))
    s.tails.forEach((tail, side) => {
      const sgn = side === 0 ? -1 : 1
      const anchorX = s.head.x + perpX * sgn * R * 0.58 - dirX * R * 0.22
      const anchorY = s.head.y + perpY * sgn * R * 0.58 - dirY * R * 0.22
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
        const sway = Math.sin(t * 1.6 + j * 0.55 + side * 1.3) * R * 0.012 * j
        const spread = R * 0.018 * (1 - j / n)
        node.x += vx + perpX * (sway + spread) * sgn + scrollKick * R * 0.01 * j * sgn
        node.y += vy + perpY * (sway + spread) * sgn - R * 0.012 * (1 + j * 0.2) + scrollKick * R * 0.03
        const prev = tail[j - 1] as Node
        // Raideur en flexion : on tire le nœud vers le prolongement du segment précédent,
        // la mèche reste une courbe souple au lieu de se couder.
        if (j >= 2) {
          const pp = tail[j - 2] as Node
          node.x += (2 * prev.x - pp.x - node.x) * 0.16
          node.y += (2 * prev.y - pp.y - node.y) * 0.16
        }
        const rest = R * 0.42 * (1 - j * 0.03)
        const dx = node.x - prev.x
        const dy = node.y - prev.y
        const d = Math.hypot(dx, dy) || 1
        node.x = prev.x + (dx / d) * rest
        node.y = prev.y + (dy / d) * rest
      })
    })
    // Les deux traînes restent deux mèches distinctes (pas de fusion en une masse).
    const [left, right] = s.tails as [Node[], Node[]]
    for (let j = 1; j < n; j++) {
      const a = left[j] as Node
      const b = right[j] as Node
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const min = radius(j) * 2 + R * 0.22
      if (d < min) {
        const push = (min - d) * 0.5
        a.x -= (dx / d) * push
        a.y -= (dy / d) * push
        b.x += (dx / d) * push
        b.y += (dy / d) * push
      }
    }

    // Apparition après le loader : la silhouette grandit depuis rien.
    s.intro += ((loaderDone ? 1 : 0) - s.intro) * (1 - Math.exp(-dt * 2.2))
    const grow = s.intro

    const mu = mask.u
    mu.uHead.value.set(s.head.x, s.head.y, R * grow)
    mu.uLag.value.set(s.lag.x, s.lag.y, R * 0.72 * grow)
    s.tails.forEach((tail, side) =>
      tail.forEach((node, j) => (mu.uTail.value[side * MAX_TAIL + j] as Vector3).set(node.x, node.y, radius(j) * grow)),
    )
    mu.uTailLen.value = n
    for (let i = 0; i < droplets; i++) {
      const a = t * (0.35 + i * 0.12) + i * 2.1
      ;(mu.uDrops.value[i] as Vector3).set(
        s.head.x + Math.cos(a) * R * 2.3,
        s.head.y + Math.sin(a * 1.3) * R * 1.9,
        R * (0.11 + 0.025 * Math.sin(t + i)) * grow,
      )
    }
    mu.uDropCount.value = droplets
    mu.uNeck.value = R * 0.55
    mu.uSoft.value = R * 0.3
    mu.uView.value.set(W, H)

    // Masque hors-écran, rendu juste avant la vue (même contexte, même frame).
    const dpr = state.viewport.dpr
    const fw = Math.max(2, Math.round(W * dpr * maskScale))
    const fh = Math.max(2, Math.round(H * dpr * maskScale))
    if (mask.target.width !== fw || mask.target.height !== fh) mask.target.setSize(fw, fh)
    const gl = state.gl
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(mask.target)
    gl.render(mask.scene, mask.camera)
    gl.setRenderTarget(previous)

    const texelPx = W / fw
    u.uLogoTexel.value.set(1 / fw, 1 / fh)
    u.uSpread.value = Math.max(1, (R * 0.06) / texelPx)
    // Gradient du masque ramené à ~1 dans la rampe (largeur 2 × uSoft).
    u.uGradScale.value = (2 * mu.uSoft.value) / (texelPx * 2 * u.uSpread.value)
    u.uResolution.value.set(W * dpr, H * dpr)
    u.uFrame.value.set(s.head.x * dpr, s.head.y * dpr, R * 1.4 * dpr)
    u.uTime.value = t
    u.uLight.value.set(-0.4 + (s.head.x / W - 0.5) * 0.6, 0.6 - (s.head.y / H - 0.5) * 0.4)
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
