import type { Metadata, Viewport } from 'next'
import { Anybody, Instrument_Sans } from 'next/font/google'
import { Providers } from '@/components/providers/Providers'
import './globals.css'

// Seul le sous-ensemble « latin » est préchargé. latin-ext (ō, ū…) reste déclaré et
// n'est téléchargé que si ces glyphes apparaissent. Les titres japonais utilisent la
// police système (voir --font-jp) : une webfont CJK ajoutait ~120 @font-face bloquants.
// Police d'affichage non préchargée : elle ne concurrence pas le CSS ni la police du
// texte LCP. Sans risque de CLS (largeurs du titre figées en em) et masquée par le loader.
const anybody = Anybody({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-anybody',
  display: 'swap',
  preload: false,
})

// Pas de préchargement non plus : le texte s'affiche aussitôt avec la police de
// secours aux métriques ajustées par next/font, et le remplacement se fait sous le loader.
const instrument = Instrument_Sans({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-instrument',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Miku, en dix morceaux — le Top 10 Hatsune Miku',
    template: '%s — Miku, en dix morceaux',
  },
  description:
    'Le classement des dix chansons qui ont fait d’une voix de synthèse une star mondiale, de Melt à Mesmerizer. Site de fan, visuels génératifs.',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'Miku, en dix morceaux',
    description: 'Le Top 10 des chansons de Hatsune Miku, en visuels génératifs.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0B0F0E',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

/**
 * Exécuté avant le premier paint :
 *  - fixe html[data-motion] (préférence OS, toggle mémorisé ou ?mode=reduced) pour
 *    éviter tout flash d'animation chez les personnes qui les ont désactivées ;
 *  - easter egg : décale légèrement la teinte de l'accent à chaque rechargement.
 */
const prePaint = `(function(){try{
var d=document.documentElement,q=new URLSearchParams(location.search).get('mode'),s=null;
try{s=localStorage.getItem('miku:motion')}catch(e){}
var r=q==='reduced'?true:(q==='full'||q==='lite')?false:s?s==='reduced':matchMedia('(prefers-reduced-motion: reduce)').matches;
d.setAttribute('data-motion',r?'reduced':'full');
var n=0;try{n=(parseInt(localStorage.getItem('miku:hue')||'0',10)+1)%7;localStorage.setItem('miku:hue',String(n))}catch(e){}
var h=[0,-9,7,-14,12,-4,16][n];d.style.setProperty('--hue-shift',h+'deg');d.setAttribute('data-hue',String(n));
}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${anybody.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
      </head>
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
