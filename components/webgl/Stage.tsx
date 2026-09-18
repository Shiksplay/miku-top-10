'use client'

import { View } from '@react-three/drei'
import { Canvas, advance, useThree } from '@react-three/fiber'
import { Suspense, lazy, useEffect, useMemo, useRef, type ComponentType, type RefObject } from 'react'
import { useStageRegistry, type SceneKey } from '@/lib/stage-registry'
import { useExperience } from '@/lib/store'
import { ticker } from '@/lib/ticker'
import CardArt from './scenes/CardArt'
import HeroBlob from './scenes/HeroBlob'
import LogoMetal from './scenes/LogoMetal'

// Scènes lourdes chargées seulement quand elles sont demandées.
const Constellation = lazy(() => import('./scenes/Constellation'))
const DetailScene = lazy(() => import('./scenes/detail/DetailScene'))

type SceneProps = { track: RefObject<HTMLElement | null>; lite?: boolean } & Record<string, unknown>
const scenes: Record<SceneKey, ComponentType<SceneProps>> = {
  'hero-blob': HeroBlob as ComponentType<SceneProps>,
  'logo-metal': LogoMetal as ComponentType<SceneProps>,
  'card-art': CardArt as unknown as ComponentType<SceneProps>,
  constellation: Constellation as unknown as ComponentType<SceneProps>,
}

/**
 * Pilote de frames. Le canvas est en frameloop="never" : on avance la scène
 * depuis le ticker GSAP/Lenis (même frame que le scroll). Repli sur un rAF local
 * si Lenis n'est pas actif. Aucune frame n'est rendue quand aucune vue n'est montée.
 */
function FrameDriver({ active }: { active: boolean }) {
  const get = useThree((s) => s.get)
  const gl = useThree((s) => s.gl)
  const setStageReady = useExperience((s) => s.setStageReady)
  const warm = useRef(0)
  const origin = useRef(performance.now())

  useEffect(() => {
    let raf = 0
    const step = () => {
      const running = active || warm.current < 3
      if (!running) return
      advance((performance.now() - origin.current) / 1000, false, get())
      if (warm.current < 3) {
        warm.current += 1
        if (warm.current === 3) setStageReady()
      }
    }
    const unsubscribe = ticker.add(step)
    const loop = () => {
      if (!ticker.isDriven()) step()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    if (!active) {
      gl.setScissorTest(false)
      gl.clear()
    }
    return () => {
      unsubscribe()
      cancelAnimationFrame(raf)
    }
  }, [active, get, gl, setStageReady])

  return null
}

function Views({ hidden, lite }: { hidden: boolean; lite: boolean }) {
  const entries = useStageRegistry((s) => s.entries)
  return (
    <>
      {Object.values(entries).map((e) => {
        const Scene = scenes[e.scene]
        return (
          <View
            key={e.id}
            track={e.track as RefObject<HTMLElement>}
            index={e.index}
            // Le logo du header reste visible au-dessus de la vue détail.
            visible={!hidden || e.scene === 'logo-metal'}
          >
            <Suspense fallback={null}>
              <Scene track={e.track} lite={lite} {...e.props} />
            </Suspense>
          </View>
        )
      })}
    </>
  )
}

export default function Stage() {
  const mode = useExperience((s) => s.mode)
  const detailSlug = useExperience((s) => s.stageSlug)
  const count = useStageRegistry((s) => Object.keys(s.entries).length)
  const lite = mode !== 'full'
  const eventSource = useMemo(() => document.getElementById('app-root') ?? document.body, [])

  return (
    <div className="layer-stage" aria-hidden="true">
      <Canvas
        eventSource={eventSource}
        eventPrefix="client"
        frameloop="never"
        // MODE ALLÉGÉ : DPR plafonné à 1.25 et pas d'antialiasing matériel.
        dpr={lite ? [1, 1.25] : [1, 1.75]}
        flat
        gl={{
          antialias: !lite,
          alpha: true,
          stencil: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
        }}
        camera={{ position: [0, 0, 6], fov: 35 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <FrameDriver active={count > 0 || detailSlug !== null} />
        <Views hidden={detailSlug !== null} lite={lite} />
        {detailSlug && (
          <Suspense fallback={null}>
            <DetailScene key={detailSlug} slug={detailSlug} />
          </Suspense>
        )}
      </Canvas>
    </div>
  )
}
