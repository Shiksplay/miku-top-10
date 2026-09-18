'use client'

import { MeshDistortMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { SceneKind, Song } from '@/data/songs'
import { simplex3 } from '../../shaders/noise'

export type RecipeProps = { song: Song; lite: boolean }

const col = (hex: string, k = 1) => new Color(hex).multiplyScalar(k)

/* ---------------------------------------------------------------- World is Mine */
function Crystal({ song, lite }: RecipeProps) {
  const core = useRef<Mesh>(null)
  const ring = useRef<InstancedMesh>(null)
  const count = lite ? 18 : 36
  const dummy = useMemo(() => new Object3D(), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (core.current) {
      core.current.rotation.set(t * 0.2, t * 0.33, 0)
      core.current.scale.setScalar(1 + Math.pow(Math.max(0, Math.sin(t * song.tempo * 2)), 12) * 0.06)
    }
    const r = ring.current
    if (!r) return
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + t * 0.35
      const y = Math.sin(a * 3 + t) * 0.12
      dummy.position.set(Math.cos(a) * 2.1, y + 0.1, Math.sin(a) * 2.1)
      dummy.rotation.set(t + i, t * 0.7 + i, 0)
      dummy.scale.setScalar(0.08 + (i % 3) * 0.03)
      dummy.updateMatrix()
      r.setMatrixAt(i, dummy.matrix)
    }
    r.instanceMatrix.needsUpdate = true
  })
  return (
    <group rotation={[0.35, 0, -0.2]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial color={song.accent} emissive={song.accent} emissiveIntensity={0.35} metalness={0.7} roughness={0.18} flatShading />
      </mesh>
      <instancedMesh ref={ring} args={[undefined, undefined, count]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#39C5BB" emissive="#39C5BB" emissiveIntensity={1.2} flatShading />
      </instancedMesh>
    </group>
  )
}

/* ---------------------------------------------------------------- Melt */
function Melt({ song, lite }: RecipeProps) {
  const drops = useRef<Group>(null)
  const n = lite ? 4 : 8
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({ x: (Math.random() - 0.5) * 1.2, phase: i / n })), [n])
  useFrame((s) => {
    const t = s.clock.elapsedTime * 0.35 * song.tempo
    drops.current?.children.forEach((d, i) => {
      const seed = seeds[i]
      if (!seed) return
      const p = (t + seed.phase) % 1
      d.position.set(seed.x * (1 - p * 0.3), -0.9 - p * 2.4, 0.2)
      d.scale.set(0.12 * (1 - p * 0.5), 0.12 + p * 0.25, 0.12 * (1 - p * 0.5))
    })
  })
  return (
    <group position={[0, 0.5, 0]}>
      <mesh>
        <sphereGeometry args={[1.15, lite ? 48 : 96, lite ? 48 : 96]} />
        <MeshDistortMaterial color={song.accent} emissive={song.accent} emissiveIntensity={0.25} roughness={0.12} metalness={0.3} distort={0.42} speed={1.2} />
      </mesh>
      <group ref={drops}>
        {seeds.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color={song.accent} emissive={song.accent} emissiveIntensity={0.6} roughness={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ---------------------------------------------------------------- Senbonzakura */
function Petals({ song, lite }: RecipeProps) {
  const ref = useRef<InstancedMesh>(null)
  const count = lite ? 180 : 620
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        r: 0.35 + Math.pow(Math.random(), 0.8) * 1.8,
        a: Math.random() * Math.PI * 2,
        y: (Math.random() - 0.5) * 3.8,
        speed: 0.2 + Math.random() * 0.6,
        spin: Math.random() * 6,
      })),
    [count],
  )
  const dummy = useMemo(() => new Object3D(), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime * song.tempo * 0.6
    const m = ref.current
    if (!m) return
    data.forEach((p, i) => {
      const a = p.a + t * p.speed * (1.4 - p.r * 0.25)
      const y = ((p.y - t * p.speed * 0.5 + 1.9) % 3.8 + 3.8) % 3.8 - 1.9
      dummy.position.set(Math.cos(a) * p.r, y, Math.sin(a) * p.r)
      dummy.rotation.set(t * p.spin * 0.3, a, t * p.spin * 0.2)
      dummy.scale.set(0.06, 0.035, 1)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  const color = useMemo(() => col(song.accent, 1.05), [song.accent])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <circleGeometry args={[1, 6]} />
      <meshBasicMaterial color={color} side={DoubleSide} transparent opacity={0.9} toneMapped={false} />
    </instancedMesh>
  )
}

/* ---------------------------------------------------------------- Rolling Girl */
function Rolling({ song }: RecipeProps) {
  const g = useRef<Group>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime * song.tempo
    g.current?.children.forEach((c, i) => {
      c.rotation.z = -t * (1.2 + i * 0.35)
      c.position.x = Math.sin(t * 0.4 + i) * 0.5
    })
  })
  return (
    <group ref={g} rotation={[0.2, -0.5, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0, -i * 0.5]} rotation={[0, 0, i]}>
          <torusGeometry args={[1.2 - i * 0.18, 0.05 + i * 0.015, 16, 120, Math.PI * (1.2 + i * 0.2)]} />
          <meshBasicMaterial color={col(i % 2 ? '#F0468F' : song.accent, 1.5)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- Ievan Polkka */
function Baton({ song, lite }: RecipeProps) {
  const baton = useRef<Group>(null)
  const dots = useRef<InstancedMesh>(null)
  const count = lite ? 24 : 64
  const dummy = useMemo(() => new Object3D(), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (baton.current) baton.current.rotation.z = t * song.tempo * 3.2
    const m = dots.current
    if (!m) return
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const bounce = Math.abs(Math.sin(t * song.tempo * 2.4 + i * 0.5))
      dummy.position.set(Math.cos(a) * 2.3, Math.sin(a) * 1.4 + bounce * 0.2, -0.5)
      dummy.scale.setScalar(0.05 + bounce * 0.05)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <group ref={baton}>
        <mesh position={[0, 0.55, 0]}>
          <capsuleGeometry args={[0.16, 1.1, 8, 24]} />
          <meshStandardMaterial color={song.accent} emissive={song.accent} emissiveIntensity={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <capsuleGeometry args={[0.18, 0.9, 8, 24]} />
          <meshStandardMaterial color="#F4F3F1" emissive="#F4F3F1" emissiveIntensity={0.25} roughness={0.4} />
        </mesh>
      </group>
      <instancedMesh ref={dots} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={col('#39C5BB', 1.6)} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/* ---------------------------------------------------------------- Disappearance */
function Dissolve({ song, lite }: RecipeProps) {
  const count = lite ? 2200 : 9000
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: col(song.accent, 1.4) },
          uSize: { value: lite ? 9 : 7 },
        },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uSize;
          attribute float aSeed;
          varying float vFade;
          ${simplex3}
          void main() {
            float cycle = fract(uTime * 0.12);
            float th = smoothstep(0.0, 0.8, cycle);
            float n = snoise(position * 1.6 + 3.0) * 0.5 + 0.5;
            float gone = smoothstep(n - 0.08, n + 0.08, th);
            vec3 dir = normalize(position + vec3(snoise(position * 2.0 + uTime * 0.3)));
            vec3 p = position + dir * gone * (1.2 + aSeed * 2.5) + vec3(0.0, gone * aSeed * 1.4, 0.0);
            vFade = 1.0 - gone * 0.85;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize * (4.0 / -mv.z) * (0.6 + aSeed);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; varying float vFade;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            if (d > 0.5) discard;
            gl_FragColor = vec4(uColor * vFade, smoothstep(0.5, 0.0, d) * vFade);
          }`,
      }),
    [song.accent, lite],
  )
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const r = 1.3 * Math.cbrt(0.7 + Math.random() * 0.3)
      const s = Math.sqrt(1 - u * u)
      pos.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r], i * 3)
      seed[i] = Math.random()
    }
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1))
    return g
  }, [count])
  useFrame((s) => {
    const u = material.uniforms.uTime
    if (u) u.value = s.clock.elapsedTime * song.tempo * 0.6
  })
  return <points geometry={geometry} material={material} />
}

/* ---------------------------------------------------------------- Tell Your World */
function Network({ song, lite }: RecipeProps) {
  const g = useRef<Group>(null)
  const nodes = lite ? 48 : 110
  const { points, lines } = useMemo(() => {
    const pts: Vector3[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < nodes; i++) {
      const y = 1 - (i / (nodes - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      pts.push(new Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r).multiplyScalar(1.7))
    }
    const seg: number[] = []
    pts.forEach((a, i) => {
      pts
        .map((b, j) => ({ j, d: a.distanceTo(b) }))
        .filter((x) => x.j > i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 3)
        .forEach(({ j }) => {
          const b = pts[j] as Vector3
          seg.push(a.x, a.y, a.z, b.x, b.y, b.z)
        })
    })
    const lines = new BufferGeometry()
    lines.setAttribute('position', new Float32BufferAttribute(seg, 3))
    const points = new BufferGeometry().setFromPoints(pts)
    return { points, lines }
  }, [nodes])
  useFrame((s) => {
    if (g.current) g.current.rotation.y = s.clock.elapsedTime * 0.18 * song.tempo
  })
  return (
    <group ref={g} rotation={[0.3, 0, 0]}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={col(song.accent, 1.2)} transparent opacity={0.45} toneMapped={false} />
      </lineSegments>
      <points geometry={points}>
        <pointsMaterial color={col('#F4F3F1', 1.5)} size={0.07} sizeAttenuation toneMapped={false} />
      </points>
      <mesh>
        <sphereGeometry args={[1.45, 32, 32]} />
        <meshBasicMaterial color={song.accent} transparent opacity={0.06} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- Ghost Rule */
function Ghost({ song }: RecipeProps) {
  const g = useRef<Group>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const glitch = Math.sin(t * song.tempo * 6) > 0.93 ? 1 : 0
    g.current?.children.forEach((c, i) => {
      c.position.x = (i - 1) * 0.08 + glitch * (Math.random() - 0.5) * 0.4
      c.position.y = Math.sin(t * 0.8 + i) * 0.1
    })
  })
  const colors = [song.accent, '#39C5BB', '#F4F3F1']
  return (
    <group ref={g}>
      {colors.map((c, i) => (
        <mesh key={c} scale={1.2 - i * 0.08}>
          <icosahedronGeometry args={[1, 4]} />
          <MeshDistortMaterial color={c} emissive={c} emissiveIntensity={0.4} transparent opacity={0.32} distort={0.35 + i * 0.1} speed={2 + i} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- Mesmerizer */
function Spiral({ song }: RecipeProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uA: { value: col(song.accent, 1.3) }, uB: { value: new Color('#39C5BB') } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uA; uniform vec3 uB; varying vec2 vUv;
          void main(){
            vec2 p = vUv - 0.5; float r = length(p); float a = atan(p.y, p.x);
            float s = sin(a * 4.0 + log(r + 0.01) * 12.0 - uTime * 3.0);
            float rings = smoothstep(0.2, 1.0, s);
            vec3 c = mix(uB, uA, rings);
            float mask = smoothstep(0.5, 0.2, r);
            gl_FragColor = vec4(c * (0.4 + rings), mask * (0.35 + rings * 0.65));
          }`,
      }),
    [song.accent],
  )
  const torus = useRef<Mesh>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime * song.tempo
    const u = material.uniforms.uTime
    if (u) u.value = t
    if (torus.current) torus.current.rotation.set(t * 0.3, t * 0.5, 0)
  })
  return (
    <group>
      <mesh material={material} position={[0, 0, -0.5]}>
        <planeGeometry args={[6, 6]} />
      </mesh>
      <mesh ref={torus}>
        <torusKnotGeometry args={[0.8, 0.07, 220, 12, 3, 5]} />
        <meshBasicMaterial color={col('#F4F3F1', 1.4)} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- Miku (Anamanaguchi) */
function Voxels({ song, lite }: RecipeProps) {
  const ref = useRef<InstancedMesh>(null)
  const side = lite ? 8 : 12
  const count = side * side
  const dummy = useMemo(() => new Object3D(), [])
  const palette = useMemo(() => [new Color('#39C5BB').multiplyScalar(1.3), new Color(song.gradient.color2).multiplyScalar(1.3)], [song])
  useFrame((s) => {
    const t = s.clock.elapsedTime * song.tempo
    const m = ref.current
    if (!m) return
    let i = 0
    for (let x = 0; x < side; x++)
      for (let z = 0; z < side; z++) {
        const d = Math.hypot(x - side / 2, z - side / 2)
        const h = 0.15 + Math.max(0, Math.sin(t * 2.4 - d * 0.7)) * 1.1
        dummy.position.set((x - side / 2) * 0.32, h / 2 - 1, (z - side / 2) * 0.32)
        dummy.scale.set(0.26, h, 0.26)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
        m.setColorAt(i, palette[(x + z) % 2] as Color)
        i++
      }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <group rotation={[0.55, 0.6, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

export const recipes: Record<SceneKind, (p: RecipeProps) => React.JSX.Element> = {
  crystal: Crystal,
  melt: Melt,
  petals: Petals,
  rolling: Rolling,
  baton: Baton,
  dissolve: Dissolve,
  network: Network,
  ghost: Ghost,
  spiral: Spiral,
  voxels: Voxels,
}
