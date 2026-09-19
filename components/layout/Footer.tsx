import { MotionToggle } from '@/components/ui/MotionToggle'

const credits = [
  { name: 'ShaderGradient', by: 'ruucm', href: 'https://github.com/ruucm/shadergradient' },
  { name: 'liquid-glass-js', by: 'dashersw', href: 'https://github.com/dashersw/liquid-glass-js' },
  { name: 'liquid-logo', by: 'collidingScopes', href: 'https://github.com/collidingScopes/liquid-logo' },
  { name: 'React Three Fiber', by: 'pmndrs', href: 'https://github.com/pmndrs/react-three-fiber' },
]

export function Footer() {
  return (
    <footer
      id="pied-de-page"
      data-page-content
      className="relative px-[var(--gutter)] pb-32 pt-[clamp(4rem,10vh,7rem)]"
    >
      <div className="grid gap-12 border-t border-paper/10 pt-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
        <div className="max-w-[52ch] space-y-4 text-small text-paper/80">
          <p>
            Site de fan, non officiel et non commercial. Hatsune Miku est une création et une marque de
            Crypton Future Media, INC. Aucune illustration, aucun logo ni aucune pochette officielle n’est
            hébergé ici : les visuels sont générés en direct par des shaders. Seule exception : au survol,
            les cartes affichent la miniature publique de la vidéo officielle, chargée directement depuis
            YouTube.
          </p>
          <p>
            Aucun fichier audio ni aucune parole n’est hébergé. Pour écouter, les liens renvoient vers les
            plateformes officielles.
          </p>
          <p className="text-ash">
            « 39 » se lit mi-ku, ou san-kyū : « merci ». Tapez 3 puis 9 sur votre clavier.
          </p>
        </div>

        <div>
          <h2 className="text-small font-semibold">Bibliothèques créatives (licence MIT)</h2>
          <ul className="mt-3 space-y-1.5 text-small">
            {credits.map((c) => (
              <li key={c.name}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 text-paper/85 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-pink hover:decoration-pink"
                >
                  {c.name}
                  <span className="text-ash">par {c.by}</span>
                  <span className="visually-hidden"> (nouvel onglet)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-2">
          <h2 className="text-small font-semibold">Accessibilité</h2>
          <MotionToggle withLabel className="-ml-3.5" />
          <p className="max-w-[26ch] text-micro text-ash">
            Suit la préférence de votre système. Réduit, le site n’utilise ni WebGL animé, ni défilement
            fluide, ni parallax.
          </p>
        </div>
      </div>
    </footer>
  )
}
