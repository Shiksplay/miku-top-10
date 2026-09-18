'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Mesh } from 'three'
import { heroGradient, songBySlug, type GradientSignature } from '@/data/songs'
import { useExperience } from '@/lib/store'
import { color, hexToRgb01 } from '@/lib/tokens'

/** Cadrages de base par type de géométrie (dérivés des presets de @shadergradient/react). */
const framing = {
  plane: { positionX: -1.4, positionY: 0, positionZ: 0, rotationX: 0, rotationY: 10, rotationZ: 50, cameraZoom: 1, uAmplitude: 1 },
  waterPlane: { positionX: 0, positionY: 0.9, positionZ: -0.3, rotationX: 45, rotationY: 0, rotationZ: 0, cameraZoom: 1, uAmplitude: 0 },
  sphere: { positionX: 0, positionY: 0, positionZ: 0, rotationX: 0, rotationY: 0, rotationZ: 140, cameraZoom: 12.5, uAmplitude: 5 },
} as const

const VOID = hexToRgb01(color.void)
const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  a.map((v, i) => v + ((b[i] ?? 0) - v) * t) as [number, number, number]

/**
 * Couleurs du fond en mode « page » : la signature du morceau, assombrie pour rester
 * un fond. Le hero reste quasi noir (#0B0F0E) avec une lueur teal.
 */
function pageColors(sig: GradientSignature, isHero: boolean): number[] {
  const [a, b, c] = isHero ? [0.42, 0.72, 0.9] : [0.34, 0.55, 0.45]
  return [
    ...mix(hexToRgb01(sig.color1), VOID, a),
    ...mix(hexToRgb01(sig.color2), VOID, b),
    ...mix(hexToRgb01(sig.color3), VOID, c),
  ]
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')

const asProps = (c: number[]) => ({
  color1: toHex(c[0] ?? 0, c[1] ?? 0, c[2] ?? 0),
  color2: toHex(c[3] ?? 0, c[4] ?? 0, c[5] ?? 0),
  color3: toHex(c[6] ?? 0, c[7] ?? 0, c[8] ?? 0),
})

const heroPageColors = asProps(pageColors(heroGradient, true))

/** Vue détail : signature du morceau un peu retenue, pour que la scène 3D et le texte ressortent. */
const detailColors = (sig: GradientSignature) =>
  asProps([
    ...mix(hexToRgb01(sig.color1), VOID, 0.22),
    ...mix(hexToRgb01(sig.color2), VOID, 0.45),
    ...mix(hexToRgb01(sig.color3), VOID, 0.3),
  ])

type UniformBag = Record<string, { value: number } | undefined>

/**
 * Interpole les couleurs du ShaderGradient vers la signature du morceau actif, en
 * écrivant directement dans les uniforms compilés. Pas de re-render React : la lib
 * recréerait son matériau, et la couleur sauterait d'un coup au lieu de glisser.
 */
function PaletteDriver() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const current = useRef<number[] | null>(null)
  const meshRef = useRef<Mesh | null>(null)

  useFrame((_, dt) => {
    const st = useExperience.getState()
    if (st.detailSlug) {
      current.current = null
      return
    }
    if (!meshRef.current || !meshRef.current.parent) {
      meshRef.current = (scene.getObjectByName('shadergradient-mesh') as Mesh | undefined) ?? null
    }
    const mesh = meshRef.current
    if (!mesh) return
    const u = (gl.properties.get(mesh.material) as { uniforms?: UniformBag }).uniforms
    if (!u?.uC1r) return

    const song = st.activeSlug ? songBySlug(st.activeSlug) : undefined
    const target = pageColors(song?.gradient ?? heroGradient, !song)
    const keys = ['uC1r', 'uC1g', 'uC1b', 'uC2r', 'uC2g', 'uC2b', 'uC3r', 'uC3g', 'uC3b']
    if (!current.current) current.current = keys.map((k) => u[k]?.value ?? 0)
    const k = 1 - Math.exp(-dt * 1.6)
    keys.forEach((key, i) => {
      const c = current.current as number[]
      c[i] = (c[i] ?? 0) + ((target[i] ?? 0) - (c[i] ?? 0)) * k
      const uniform = u[key]
      if (uniform) uniform.value = c[i] ?? 0
    })
  })
  return null
}

function ReadySignal() {
  const setReady = useExperience((s) => s.setBackdropReady)
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === 3) setReady()
  })
  return null
}

export default function Backdrop() {
  const mode = useExperience((s) => s.mode)
  const detailSlug = useExperience((s) => s.detailSlug)

  const target = useMemo<GradientSignature>(() => {
    const song = detailSlug ? songBySlug(detailSlug) : undefined
    return song?.gradient ?? heroGradient
  }, [detailSlug])

  // Changement de géométrie/caméra (ouverture du détail) : fondu court pour masquer
  // la recréation du matériau par la lib.
  const [shown, setShown] = useState(target)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (target === shown) return
    setVisible(false)
    const t = window.setTimeout(() => {
      setShown(target)
      setVisible(true)
    }, 420)
    return () => window.clearTimeout(t)
  }, [target, shown])
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 60)
    return () => window.clearTimeout(t)
  }, [])

  const isDetail = shown !== heroGradient
  const colors = isDetail ? detailColors(shown) : heroPageColors
  const f = framing[shown.type]

  // MODE ALLÉGÉ : densité de pixels fortement réduite (le dégradé est flou par nature).
  const pixelDensity = mode === 'full' ? Math.min(window.devicePixelRatio || 1, 1) : 0.5

  return (
    <div className="layer-backdrop" aria-hidden="true" style={{ opacity: visible ? 1 : 0 }}>
      <ShaderGradientCanvas
        pixelDensity={pixelDensity}
        fov={45}
        lazyLoad={false}
        pointerEvents="none"
        // Nécessaire pour que html2canvas puisse « voir » le fond sous le verre liquide.
        preserveDrawingBuffer={mode === 'full'}
        powerPreference="high-performance"
        style={{ position: 'absolute', inset: 0 }}
      >
        <ShaderGradient
          control="props"
          animate="on"
          type={shown.type}
          {...colors}
          uSpeed={shown.uSpeed}
          uStrength={shown.uStrength}
          uDensity={shown.uDensity}
          uFrequency={shown.uFrequency}
          uAmplitude={f.uAmplitude}
          positionX={f.positionX}
          positionY={f.positionY}
          positionZ={f.positionZ}
          rotationX={f.rotationX}
          rotationY={f.rotationY}
          rotationZ={f.rotationZ}
          cDistance={shown.type === 'sphere' ? 1.5 : shown.cDistance}
          cameraZoom={shown.type === 'sphere' ? shown.cDistance * 3.6 : f.cameraZoom}
          cPolarAngle={shown.cPolarAngle}
          cAzimuthAngle={shown.cAzimuthAngle}
          lightType="3d"
          brightness={isDetail ? 0.92 : 1}
          grain="off"
          reflection={0.1}
        />
        <PaletteDriver />
        <ReadySignal />
      </ShaderGradientCanvas>
    </div>
  )
}
