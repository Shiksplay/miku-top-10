'use client'

import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import { songBySlug, type SceneKind } from '@/data/songs'
import { useExperience } from '@/lib/store'
import { hexToRgb01 } from '@/lib/tokens'
import { cardArtFragment } from '../shaders/cardArt'

const kinds: SceneKind[] = ['crystal', 'melt', 'petals', 'rolling', 'baton', 'dissolve', 'network', 'ghost', 'spiral', 'voxels']

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`

const BARS = 20

/**
 * Spectre SYNTHÉTIQUE : aucun audio n'est hébergé ni lu. Les barres réagissent
 * à une pulsation calculée depuis le tempo artistique du morceau (grosse caisse +
 * harmoniques pseudo-aléatoires).
 */
function spectrum(i: number, t: number, tempo: number, seed: number) {
  const beatPhase = (t * tempo * 1.2) % 1
  const kick = Math.pow(1 - beatPhase, 5)
  const low = 1 - i / BARS
  const wobble =
    0.5 + 0.5 * Math.sin(t * tempo * 3.1 + i * 0.73 + seed) * Math.cos(t * tempo * 1.7 + i * 0.31)
  return 0.12 + wobble * (0.35 + 0.35 * low) + kick * low * 0.75
}

type Props = { track: RefObject<HTMLElement | null>; slug: string; lite?: boolean }

export default function CardArt({ track, slug, lite = false }: Props) {
  const song = songBySlug(slug)
  const seed = useMemo(() => Math.random() * 100, [])

  const { art, u } = useMemo(() => {
    const g = song?.gradient
    const u = {
      uRes: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uKind: { value: song ? kinds.indexOf(song.scene) : 0 },
      uHover: { value: 0 },
      uTempo: { value: song?.tempo ?? 1 },
      uSeed: { value: seed },
      uC1: { value: new Vector3(...hexToRgb01(g?.color1 ?? '#39C5BB')) },
      uC2: { value: new Vector3(...hexToRgb01(g?.color2 ?? '#0E3B38')) },
      uC3: { value: new Vector3(...hexToRgb01(g?.color3 ?? '#0B0F0E')) },
    }
    const art = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: cardArtFragment,
      depthWrite: false,
      uniforms: u,
    })
    return { art, u }
  }, [song, seed])

  const bars = useRef<InstancedMesh>(null)
  const { geometry, material } = useMemo(() => {
    const geometry = new BoxGeometry(1, 1, 1)
    geometry.translate(0, 0.5, 0)
    const material = new MeshBasicMaterial({ toneMapped: false })
    return { geometry, material }
  }, [])

  useEffect(() => {
    const mesh = bars.current
    if (!mesh || !song) return
    const a = new Color(song.gradient.color2)
    const b = new Color(song.accent)
    const c = new Color()
    for (let i = 0; i < BARS; i++) {
      c.copy(a).lerp(b, i / (BARS - 1)).multiplyScalar(1.6)
      mesh.setColorAt(i, c)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [song])

  useEffect(
    () => () => {
      art.dispose()
      geometry.dispose()
      material.dispose()
    },
    [art, geometry, material],
  )

  const dummy = useMemo(() => new Object3D(), [])
  const heights = useRef(new Float32Array(BARS))

  useFrame((state, dt) => {
    const el = track.current
    if (!el || !song) return
    const t = state.clock.elapsedTime
    u.uTime.value = t
    u.uRes.value.set(el.clientWidth, el.clientHeight)
    const hovered = useExperience.getState().hoveredSlug === slug
    const target = hovered && !lite ? 1 : 0
    u.uHover.value += (target - u.uHover.value) * (1 - Math.exp(-dt * 7))

    const mesh = bars.current
    if (!mesh) return
    const reveal = u.uHover.value
    mesh.visible = reveal > 0.01
    if (!mesh.visible) return
    const halfH = Math.tan((17 * Math.PI) / 180) * 4.4
    const width = 2 * halfH * (el.clientWidth / Math.max(1, el.clientHeight)) * 0.84
    for (let i = 0; i < BARS; i++) {
      const h = spectrum(i, t, song.tempo, seed)
      const prev = heights.current[i] ?? 0
      const next = prev + (h - prev) * (1 - Math.exp(-dt * 14))
      heights.current[i] = next
      const stagger = Math.min(1, Math.max(0, reveal * 1.6 - (i / BARS) * 0.6))
      dummy.position.set(-width / 2 + (i + 0.5) * (width / BARS), -1.05, 0)
      dummy.scale.set((width / BARS) * 0.62, Math.max(0.001, next * 1.25 * stagger), 0.12)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.rotation.y = Math.sin(t * 0.4) * 0.18
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.2, 4.4]} fov={34} />
      <mesh frustumCulled={false} material={art} renderOrder={-1}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <instancedMesh ref={bars} args={[geometry, material, BARS]} frustumCulled={false} />
    </>
  )
}
