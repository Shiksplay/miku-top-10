'use client'

import { PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useMemo, useRef } from 'react'
import { Group, PerspectiveCamera as PCam, Vector2 } from 'three'
import { songBySlug } from '@/data/songs'
import { pointer, useExperience } from '@/lib/store'
import { recipes } from './recipes'

/** MODE ALLÉGÉ : pas de post-process, on rend la scène nous-mêmes (priorité 1). */
function ManualRender() {
  useFrame(({ gl, scene, camera }) => {
    gl.autoClear = true
    gl.render(scene, camera)
  }, 1)
  return null
}

export default function DetailScene({ slug }: { slug: string }) {
  const song = songBySlug(slug)
  const mode = useExperience((s) => s.mode)
  const lite = mode !== 'full'
  const group = useRef<Group>(null)
  const cam = useRef<PCam>(null)
  const size = useThree((s) => s.size)
  const intro = useRef(0)
  const caOffset = useMemo(() => new Vector2(0.0013, 0.0009), [])

  // Les vues drei (ex. le logo du header) laissent le viewport réglé sur leur
  // rectangle : on le remet plein cadre avant le rendu du détail (priorité 1).
  useFrame(({ gl, size: s }) => {
    gl.setScissorTest(false)
    gl.setViewport(0, 0, s.width, s.height)
  }, 0)

  useFrame((_, dt) => {
    const g = group.current
    const c = cam.current
    if (c && c.aspect !== size.width / size.height) {
      c.aspect = size.width / size.height
      c.updateProjectionMatrix()
    }
    if (!g) return
    intro.current = Math.min(1, intro.current + dt * 1.1)
    const e = 1 - Math.pow(1 - intro.current, 3)
    const px = pointer.x / Math.max(1, window.innerWidth) - 0.5
    const py = pointer.y / Math.max(1, window.innerHeight) - 0.5
    const k = 1 - Math.exp(-dt * 3)
    g.rotation.y += (px * 0.6 - g.rotation.y) * k
    g.rotation.x += (py * 0.35 - g.rotation.x) * k
    const wide = size.width > 900
    g.position.x += ((wide ? 1.35 : 0) - g.position.x) * k
    g.position.y += ((wide ? 0 : 0.9) - g.position.y) * k
    g.scale.setScalar((wide ? 1 : 0.72) * (0.55 + 0.45 * e))
  })

  if (!song) return null
  const Recipe = recipes[song.scene]

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={[0, 0, 6.5]} fov={35} />
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 4]} intensity={45} color={song.accent} />
      <pointLight position={[-4, -2, 3]} intensity={32} color="#39C5BB" />
      <group ref={group}>
        <Recipe song={song} lite={lite} />
      </group>
      {lite ? (
        <ManualRender />
      ) : (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.34} luminanceSmoothing={0.3} radius={0.68} />
          <ChromaticAberration
            offset={caOffset}
            radialModulation
            modulationOffset={0.25}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
      )}
    </>
  )
}
