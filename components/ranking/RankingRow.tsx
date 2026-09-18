'use client'

import { GlassSurface } from '@/components/glass/GlassSurface'
import { StageView } from '@/components/webgl/StageView'
import { genreLabel, type Song } from '@/data/songs'
import { useExperience } from '@/lib/store'
import { SongArtFallback } from './SongArtFallback'
import { YearRoll } from './YearRoll'


export function RankingRow({ song }: { song: Song }) {
  const setHovered = useExperience((s) => s.setHovered)
  const openDetail = useExperience((s) => s.openDetail)
  const primary = song.listen[0]
  const rank = String(song.rank).padStart(2, '0')

  const enter = () => setHovered(song.slug)
  const leave = () => {
    if (useExperience.getState().hoveredSlug === song.slug) setHovered(null)
  }

  return (
    <li
      id={`rang-${song.rank}`}
      data-slug={song.slug}
      className="rank-row relative grid gap-x-[clamp(1.5rem,3vw,3.5rem)] gap-y-6 px-[var(--gutter)] py-[clamp(3rem,9vh,6.5rem)] lg:grid-cols-[minmax(0,13rem)_auto_minmax(0,1fr)] lg:items-stretch xl:grid-cols-[minmax(0,15rem)_auto_minmax(0,27rem)]"
      style={{ '--row-accent': song.accent } as React.CSSProperties}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) leave()
      }}
    >
      <div className="rank-col flex items-start lg:items-center" aria-hidden="true">
        <span className="rank-numeral block" style={{ color: 'var(--row-accent)' }}>
          {rank}
        </span>
      </div>

      <div className="art-col flex justify-start">
        <button
          type="button"
          onClick={() => openDetail(song.slug)}
          // Doublon souris du bouton « Voir le détail » : hors de l'ordre de tabulation.
          tabIndex={-1}
          aria-label={`Ouvrir le détail de ${song.title}`}
          aria-describedby={`art-${song.slug}`}
          className="art-tile group relative block aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-tile)] lg:h-[min(70vh,46vw)] lg:w-auto"
        >
          <StageView
            scene="card-art"
            props={{ slug: song.slug }}
            index={3}
            className="art-track absolute inset-0"
            fallback={<SongArtFallback song={song} />}
          />
          <span
            className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-paper/10 transition-[box-shadow] duration-500 group-hover:ring-paper/30"
            aria-hidden="true"
          />
          <span id={`art-${song.slug}`} className="visually-hidden">
            {song.artAlt}
          </span>
        </button>
      </div>

      <GlassSurface
        as="article"
        aria-labelledby={`titre-${song.slug}`}
        radius={28}
        tint={0.22}
        params={{ darken: 0.5 }}
        className="info-card flex flex-col p-6 md:p-8 lg:h-[min(70vh,46vw)]"
      >
        <header>
          <p className="text-small text-ash">
            <span className="visually-hidden">Rang </span>
            <span className="tabular">N°{song.rank}</span>
            <span className="visually-hidden"> sur 10</span>
          </p>
          <h3
            id={`titre-${song.slug}`}
            className="font-display mt-2 text-title text-balance"
            style={{ '--wdth': 104, '--wght': 760 } as React.CSSProperties}
          >
            {song.title}
          </h3>
          {song.titleJa && (
            <p lang="ja" className="font-jp mt-1.5 text-small text-ash">
              {song.titleJa}
            </p>
          )}
        </header>

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-small">
          <dt className="text-ash">Producteur</dt>
          <dd>{song.producer}</dd>
          <dt className="text-ash">Année</dt>
          <dd className="tabular">{song.year}</dd>
          <dt className="text-ash">Genre</dt>
          <dd>{genreLabel[song.genre]}</dd>
        </dl>

        <p className="mt-6 text-body text-pretty">{song.hook}</p>

        <div className="reveal mt-auto pt-6">
          <p className="text-small text-paper/80 text-pretty max-lg:hidden xl:block">{song.story[0]}</p>
          <div className="mt-5">
            <YearRoll year={song.year} accent={song.accent} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openDetail(song.slug)}
              className="inline-flex min-h-11 items-center rounded-full bg-paper px-5 text-small font-semibold text-void transition-colors duration-300 hover:bg-pink"
            >
              Voir le détail<span className="visually-hidden"> de {song.title}</span>
            </button>
            {primary && (
              <a
                href={primary.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-small text-paper ring-1 ring-inset ring-paper/25 transition-colors duration-300 hover:text-pink hover:ring-pink"
              >
                <span>
                  Écouter<span className="visually-hidden"> {song.title}</span> sur {primary.platform}
                  <span className="visually-hidden"> (recherche, nouvel onglet)</span>
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2 8 8 2M3 2h5v5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </GlassSurface>
    </li>
  )
}
