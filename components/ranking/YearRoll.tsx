import { yearSpan } from '@/lib/tokens'

/**
 * Mini piano-roll : la barre de note se place à l'année de sortie, sur l'axe
 * 2007–2024. C'est une donnée (et pas une décoration) : on compare les époques
 * d'un coup d'œil en descendant le classement.
 */
export function YearRoll({ year, accent }: { year: number; accent: string }) {
  const span = yearSpan.to - yearSpan.from
  const pos = (year - yearSpan.from) / span
  return (
    <figure className="m-0">
      <div
        className="relative h-7 w-full overflow-hidden rounded-[6px]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(244,243,241,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,243,241,0.06) 1px, transparent 1px)',
          backgroundSize: `calc(100% / ${span}) 100%, 100% 7px`,
        }}
        aria-hidden="true"
      >
        <span
          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[3px]"
          style={{
            left: `calc(${(pos * 100).toFixed(2)}% - 2px)`,
            width: `max(10px, calc(100% / ${span}))`,
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
          }}
        />
      </div>
      <figcaption className="mt-1.5 flex justify-between text-micro text-ash tabular">
        <span>{yearSpan.from}</span>
        <span className="visually-hidden">Sortie en {year}, sur une échelle de {yearSpan.from} à {yearSpan.to}</span>
        <span>{yearSpan.to}</span>
      </figcaption>
    </figure>
  )
}
