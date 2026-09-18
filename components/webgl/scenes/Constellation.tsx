'use client'

import { Line, OrbitControls, PerspectiveCamera, Sparkles } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { CatmullRomCurve3, Group, Mesh, Vector3 } from 'three'
import { songs } from '@/data/songs'
import { chronological, genreLinks, producerLinks, starPosition } from '@/lib/constellation'
import { accentRgb } from '@/lib/accent'
import { useExperience } from '@/lib/store'

type Props = { track: RefObject<HTMLElement | null> }

function Star({ slug, position, color, radius }: { slug: string; position: [number, number, number]; color: string; radius: number }) {
  const mesh = useRef<Mesh>(null)
  const halo = useRef<Mesh>(null)
  const setHovered = useExperience((s) => s.setHovered)
  const openDetail = useExperience((s) => s.openDetail)

  useFrame((state, dt) => {
    const hovered = useExperience.getState().hoveredSlug === slug
    const s = hovered ? 1.55 : 1
    const m = mesh.current
    if (!m) return
    const next = m.scale.x + (s - m.scale.x) * (1 - Math.exp(-dt * 10))
    m.scale.setScalar(next)
    if (halo.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + radius * 40) * 0.08
      halo.current.scale.setScalar(next * 2.6 * pulse)
    }
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(slug)
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    if (useExperience.getState().hoveredSlug === slug) setHovered(null)
    document.body.style.cursor = ''
  }

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        onPointerOver={over}
        onPointerOut={out}
        onClick={(e) => {
          e.stopPropagation()
          document.body.style.cursor = ''
          openDetail(slug)
        }}
      >
        <icosahedronGeometry args={[radius, 2]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Constellation Miku : les 10 morceaux sur une hélice temporelle (2007 → 2024),
 * reliés par le fil chronologique, par genre et par producteur. On la fait pivoter
 * à la souris (OrbitControls), un clic ouvre le détail. Les étiquettes sont des
 * boutons DOM projetés ici à chaque frame (accessibles au clavier).
 */
export default function Constellation({ track }: Props) {
  const group = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const accent = useMemo(() => {
    const [r, g, b] = accentRgb()
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
  }, [])

  const positions = useMemo(() => new Map(songs.map((s) => [s.slug, starPosition(s)])), [])
  const thread = useMemo(() => {
    const pts = chronological.map((s) => new Vector3(...(positions.get(s.slug) ?? [0, 0, 0])))
    return new CatmullRomCurve3(pts, false, 'centripetal').getPoints(160)
  }, [positions])

  const labels = useRef(new Map<string, HTMLElement>())
  useEffect(() => {
    const root = track.current?.parentElement
    if (!root) return
    root.setAttribute('data-live', 'true')
    root.querySelectorAll<HTMLElement>('[data-star]').forEach((el) => {
      labels.current.set(el.dataset.star ?? '', el)
    })
    const map = labels.current
    return () => {
      root.removeAttribute('data-live')
      map.forEach((el) => {
        el.style.transform = ''
        el.style.opacity = ''
        el.style.zIndex = ''
      })
      map.clear()
    }
  }, [track])

  const v = useMemo(() => new Vector3(), [])
  useFrame((state) => {
    const g = group.current
    const el = track.current
    if (!g || !el) return
    g.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.1
    const W = el.clientWidth
    const H = el.clientHeight
    songs.forEach((s) => {
      const label = labels.current.get(s.slug)
      const p = positions.get(s.slug)
      if (!label || !p) return
      v.set(p[0], p[1], p[2]).applyMatrix4(g.matrixWorld)
      const viewZ = -v.clone().applyMatrix4(camera.matrixWorldInverse).z
      const depth = Math.min(1, Math.max(0, (viewZ - 5.6) / 3.2))
      v.project(camera)
      const x = (v.x * 0.5 + 0.5) * W
      const y = (-v.y * 0.5 + 0.5) * H
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      label.style.opacity = String(1 - depth * 0.55)
      label.style.zIndex = String(Math.round((1 - depth) * 100))
    })
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.8, 7.9]} fov={36} />
      <OrbitControls
        domElement={track.current ?? undefined}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.45}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.72}
      />
      <group ref={group}>
        <Line points={thread} color={accent} lineWidth={1.2} transparent opacity={0.55} />
        {genreLinks.map(([a, b]) => (
          <Line
            key={`g-${a.slug}-${b.slug}`}
            points={[positions.get(a.slug) ?? [0, 0, 0], positions.get(b.slug) ?? [0, 0, 0]]}
            color="#F4F3F1"
            lineWidth={0.6}
            transparent
            opacity={0.18}
          />
        ))}
        {producerLinks.map(([a, b]) => (
          <Line
            key={`p-${a.slug}-${b.slug}`}
            points={[positions.get(a.slug) ?? [0, 0, 0], positions.get(b.slug) ?? [0, 0, 0]]}
            color="#F0468F"
            lineWidth={1}
            dashed
            dashSize={0.08}
            gapSize={0.06}
            transparent
            opacity={0.7}
          />
        ))}
        {songs.map((s) => (
          <Star
            key={s.slug}
            slug={s.slug}
            position={positions.get(s.slug) ?? [0, 0, 0]}
            color={s.accent}
            radius={0.07 + (11 - s.rank) * 0.011}
          />
        ))}
      </group>
      <Sparkles count={90} scale={[9, 5, 9]} size={2.2} speed={0.25} opacity={0.5} color={accent} />
    </>
  )
}
