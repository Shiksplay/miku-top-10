'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type AllHTMLAttributes,
  type Ref,
} from 'react'
import { useExperience } from '@/lib/store'
import type { Container, GlassParams, GlassType } from './liquid-glass'

const GlassParent = createContext<Container | null>(null)

type GlassTag = 'div' | 'nav' | 'button' | 'a' | 'section' | 'article' | 'aside' | 'footer' | 'header' | 'li'

type Props = Omit<AllHTMLAttributes<HTMLElement>, 'as' | 'shape'> & {
  as?: GlassTag
  /** container = Container de la lib, button = Button (verre imbriqué si dans un container). */
  variant?: 'container' | 'button'
  shape?: GlassType
  radius?: number
  tint?: number
  warp?: boolean
  params?: Partial<GlassParams>
  /** Suit la position de l'élément à chaque frame tant qu'elle change (éléments animés/fixes). */
  watchRect?: boolean
  ref?: Ref<HTMLElement>
}

/**
 * Habillage « verre liquide ».
 *  - mode complet : instancie Container/Button (port de liquid-glass-js) sur l'élément ;
 *  - mode allégé ou réduit, ou WebGL indisponible : verre CSS (backdrop-filter), sans canvas.
 * Le module WebGL et html2canvas ne sont chargés qu'en mode complet.
 */
export function GlassSurface({
  as = 'div',
  variant = 'container',
  shape = 'rounded',
  radius = 28,
  tint = 0.2,
  warp = false,
  params,
  watchRect = false,
  className = '',
  style,
  children,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ref: externalRef,
  ...rest
}: Props) {
  // Le tag varie (nav, article, button, a…) ; on le type comme un <div> pour le JSX.
  const Tag = as as 'div'
  const ref = useRef<HTMLElement | null>(null)
  const parent = useContext(GlassParent)
  const [instance, setInstance] = useState<Container | null>(null)
  const mode = useExperience((s) => s.mode)
  const loaderDone = useExperience((s) => s.loaderDone)
  const paramsKey = JSON.stringify(params ?? {})

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      ref.current = el
      if (typeof externalRef === 'function') externalRef(el)
      else if (externalRef) (externalRef as { current: HTMLElement | null }).current = el
    },
    [externalRef],
  )

  useEffect(() => {
    const el = ref.current
    if (mode !== 'full' || !loaderDone || !el) return
    // Un bouton imbriqué attend que son parent soit instancié.
    if (variant === 'button' && parent === null && el.closest('[data-glass-parent]')) return
    let inst: Container | null = null
    let cancelled = false
    import('./liquid-glass').then(({ Container, Button }) => {
      if (cancelled || !ref.current) return
      const options = {
        element: ref.current,
        borderRadius: radius,
        type: shape,
        tintOpacity: tint,
        params: JSON.parse(paramsKey) as Partial<GlassParams>,
      }
      inst = variant === 'button' ? new Button({ ...options, warp }) : new Container(options)
      if (parent && variant === 'button') {
        parent.addChild(inst)
        ;(inst as InstanceType<typeof Button>).setupAsNestedGlass()
      }
      setInstance(inst)
    })
    return () => {
      cancelled = true
      inst?.destroy()
      setInstance(null)
    }
  }, [mode, loaderDone, variant, shape, radius, tint, warp, parent, paramsKey])

  // Halo au survol / focus : anime `highlight` et redemande un rendu à chaque frame.
  const target = useRef(0)
  const raf = useRef(0)
  const animate = useCallback(() => {
    cancelAnimationFrame(raf.current)
    const step = () => {
      const inst = instance
      if (!inst) return
      inst.highlight += (target.current - inst.highlight) * 0.2
      if (Math.abs(target.current - inst.highlight) < 0.01) inst.highlight = target.current
      inst.render()
      if (inst.highlight !== target.current) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }, [instance])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // Suivi de position (ex. lecteur qui glisse) : rend tant que le rect bouge.
  useEffect(() => {
    if (!watchRect || !instance) return
    let last = ''
    let id = 0
    const tick = () => {
      const el = ref.current
      if (el) {
        const r = el.getBoundingClientRect()
        const key = `${r.left.toFixed(1)}:${r.top.toFixed(1)}:${r.width.toFixed(1)}:${r.height.toFixed(1)}`
        if (key !== last) {
          last = key
          instance.render()
        }
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [watchRect, instance])

  const borderRadius = shape === 'rounded' ? radius : 9999

  return (
    <GlassParent.Provider value={variant === 'container' ? instance : parent}>
      <Tag
        ref={setRef}
        className={`glass ${className}`}
        data-glass="css"
        data-glass-parent={variant === 'container' ? '' : undefined}
        style={{ borderRadius, ...style }}
        onPointerEnter={(e: React.PointerEvent<HTMLElement>) => {
          target.current = 1
          animate()
          onPointerEnter?.(e)
        }}
        onPointerLeave={(e: React.PointerEvent<HTMLElement>) => {
          target.current = 0
          animate()
          onPointerLeave?.(e)
        }}
        onFocus={(e: React.FocusEvent<HTMLElement>) => {
          if ((e.target as HTMLElement).matches(':focus-visible')) {
            target.current = 1
            animate()
          }
          onFocus?.(e)
        }}
        onBlur={(e: React.FocusEvent<HTMLElement>) => {
          target.current = 0
          animate()
          onBlur?.(e)
        }}
        {...rest}
      >
        {children}
      </Tag>
    </GlassParent.Provider>
  )
}
