'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, type RefObject } from 'react'
import { CanvasTexture, LinearFilter, ShaderMaterial, Vector2, Vector3 } from 'three'
import { useExperience } from '@/lib/store'
import {
  drawLogoMask,
  liquidMetalChunk,
  liquidMetalDefaults,
  paletteUniforms,
} from '../shaders/liquidMetal'

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
${liquidMetalChunk}
void main() {
  vec4 c = liquidMetal(vUv, uResolution);
  if (c.a < 0.003) discard;
  gl_FragColor = c;
}
`

type Props = { track: RefObject<HTMLElement | null> }

/** Logo « 39 » du header : même shader que le loader, rendu dans le canvas mutualisé. */
export default function LogoMetal({ track }: Props) {
  const { material, texture, u } = useMemo(() => {
    const texture = new CanvasTexture(drawLogoMask(256))
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    const d = liquidMetalDefaults
    const pal = paletteUniforms()
    const u = {
        uResolution: { value: new Vector2(64, 64) },
        uTime: { value: 0 },
        uSpeed: { value: d.uSpeed },
        uIterations: { value: d.uIterations },
        uScale: { value: d.uScale },
        uDotFactor: { value: d.uDotFactor },
        uDotMultiplier: { value: d.uDotMultiplier },
        uVOffset: { value: d.uVOffset },
        uIntensityFactor: { value: d.uIntensityFactor },
        uExpFactor: { value: d.uExpFactor },
        uColorFactors: { value: new Vector3(...d.uColorFactors) },
        uColorShift: { value: d.uColorShift },
        uNoiseIntensity: { value: d.uNoiseIntensity },
        uInteract: { value: d.uInteract },
        uThemeMix: { value: d.uThemeMix },
        uLogo: { value: texture },
        uLogoTexel: { value: new Vector2(1 / 256, 1 / 256) },
        uVoid: { value: new Vector3(...pal.uVoid) },
        uDeep: { value: new Vector3(...pal.uDeep) },
        uTeal: { value: new Vector3(...pal.uTeal) },
        uPaper: { value: new Vector3(...pal.uPaper) },
        uPink: { value: new Vector3(...pal.uPink) },
        uReveal: { value: 0 },
        uPointer: { value: new Vector2() },
    }
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: u,
    })
    return { material, texture, u }
  }, [])

  // La police d'affichage peut arriver après le premier rendu : on redessine le masque.
  useEffect(() => {
    document.fonts.ready.then(() => {
      texture.image = drawLogoMask(256)
      texture.needsUpdate = true
    })
    return () => {
      texture.dispose()
      material.dispose()
    }
  }, [texture, material])

  useFrame((state, dt) => {
    const el = track.current
    if (!el) return
    const hovered = el.closest('a')?.matches(':hover, :focus-visible') ?? false
    const dpr = state.viewport.dpr
    u.uResolution.value.set(el.clientWidth * dpr, el.clientHeight * dpr)
    const speedTarget = hovered ? 2.4 : 1
    u.uTime.value += dt * speedTarget
    u.uInteract.value += ((hovered ? 0.9 : 0.45) - u.uInteract.value) * (1 - Math.exp(-dt * 6))
    const reveal = useExperience.getState().loaderDone ? 1 : 0
    u.uReveal.value += (reveal - u.uReveal.value) * (1 - Math.exp(-dt * 2.5))
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
