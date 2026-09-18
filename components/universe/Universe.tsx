'use client'

import { StageView } from '@/components/webgl/StageView'
import { chronological } from '@/lib/constellation'
import { useExperience } from '@/lib/store'

export function Universe() {
  const openDetail = useExperience((s) => s.openDetail)
  const setHovered = useExperience((s) => s.setHovered)

  return (
    <section
      id="univers"
      tabIndex={-1}
      aria-labelledby="univers-title"
      className="relative scroll-mt-[var(--header-h)] px-[var(--gutter)] py-[var(--space-section)] outline-none"
    >
      <div className="grid gap-x-[clamp(1.5rem,4vw,5rem)] gap-y-12 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-center">
        <div>
          <h2
            id="univers-title"
            className="font-display text-heading"
            style={{ '--wdth': 118, '--wght': 820 } as React.CSSProperties}
          >
            L’univers Miku
          </h2>
          <div className="mt-8 space-y-5 text-body text-paper/85 [&>p]:max-w-[58ch]">
            <p>
              Hatsune Miku n’est pas une chanteuse mais une banque de voix. Crypton Future Media l’a publiée
              le 31 août 2007 pour le moteur VOCALOID2 de Yamaha, à partir d’enregistrements de la comédienne
              Saki Fujita.
            </p>
            <p>
              Son nom se lit à peu près « premier son du futur ». Le reste, les chansons, les clips et les
              concerts, vient de celles et ceux qui l’ont fait chanter : des milliers de producteurs, publiés
              d’abord sur Nico Nico Douga puis sur YouTube.
            </p>
            <p className="text-paper/70">
              La constellation relie les dix titres. L’hélice suit les années, les fils fins relient les
              morceaux d’un même genre et le pointillé rose relie deux titres du même producteur. Faites-la
              pivoter, puis choisissez une étoile.
            </p>
          </div>
        </div>

        <div className="constellation relative aspect-square w-full max-lg:max-w-[40rem] lg:aspect-[5/4]">
          <StageView scene="constellation" fullOnly rootMargin="10% 0px" className="absolute inset-0 cursor-grab active:cursor-grabbing" />
          <ul className="constellation-labels" aria-label="Les dix morceaux, par ordre de sortie">
            {chronological.map((s) => (
              <li key={s.slug} data-star={s.slug}>
                <button
                  type="button"
                  onClick={() => openDetail(s.slug)}
                  onPointerEnter={() => setHovered(s.slug)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(s.slug)}
                  onBlur={() => setHovered(null)}
                  className="star-label inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-micro text-paper transition-colors hover:text-pink"
                >
                  <span className="star-dot h-2 w-2 shrink-0 rounded-full" style={{ background: s.accent }} aria-hidden="true" />
                  <span className="font-medium">{s.title}</span>
                  <span className="tabular text-ash">{s.year}</span>
                  <span className="visually-hidden">, numéro {s.rank} du classement. Ouvrir le détail.</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
