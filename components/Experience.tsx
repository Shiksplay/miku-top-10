import { DetailRouter } from '@/components/detail/DetailRouter'
import { Hero } from '@/components/hero/Hero'
import { LazyOverlays } from '@/components/LazyOverlays'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Loader } from '@/components/loader/Loader'
import { Ranking } from '@/components/ranking/Ranking'
import { Universe } from '@/components/universe/Universe'
import { WebglLayers } from '@/components/webgl/WebglLayers'

/**
 * Composition de la page. Deux grands pans (à la « On Track / Off Track ») :
 * « Le classement » puis « L'univers Miku ». Les couches WebGL, le loader, le
 * lecteur et la vue détail sont partagés par les deux routes (/ et /morceau/[slug]).
 */
export function Experience({ initialSlug }: { initialSlug: string | null }) {
  return (
    <div id="app-root">
      <noscript>
        <style>{'.loader{display:none!important}'}</style>
      </noscript>
      <WebglLayers />
      <Loader />
      <Header />
      <main id="contenu" data-page-content tabIndex={-1} className="outline-none">
        <Hero />
        <Ranking />
        <Universe />
      </main>
      <Footer />
      <LazyOverlays />
      <DetailRouter initialSlug={initialSlug} />
    </div>
  )
}
