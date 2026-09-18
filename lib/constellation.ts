import { songs, type Genre, type Song } from '@/data/songs'
import { yearSpan } from './tokens'

const genreOrder: Genre[] = ['pop', 'rock', 'electro', 'folk', 'chiptune']

/**
 * Position 3D de chaque morceau : hélice temporelle (l'angle et la hauteur suivent
 * l'année), décalage angulaire selon le genre. L'échelle du temps est en racine
 * carrée : sept titres sur dix datent de 2007 à 2012, une échelle linéaire les
 * entasserait. Elle reste monotone, donc l'ordre chronologique est préservé.
 */
export function starPosition(song: Song): [number, number, number] {
  const n = Math.sqrt((song.year - yearSpan.from) / (yearSpan.to - yearSpan.from))
  const g = genreOrder.indexOf(song.genre)
  const angle = n * Math.PI * 2.2 + g * 1.2 + song.rank * 0.05
  const radius = 1.45 + (g % 2) * 0.35
  const y = (n - 0.5) * 3.1
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius]
}

/** Fil chronologique : ordre de sortie (année, puis rang). */
export const chronological = [...songs].sort((a, b) => a.year - b.year || a.rank - b.rank)

/** Liens de genre : chaque genre relie ses morceaux dans l'ordre chronologique. */
export const genreLinks: [Song, Song][] = genreOrder.flatMap((genre) => {
  const group = chronological.filter((s) => s.genre === genre)
  return group.slice(1).map((s, i) => [group[i] as Song, s] as [Song, Song])
})

/** Même producteur (ryo : World is Mine ↔ Melt). */
export const producerLinks: [Song, Song][] = (() => {
  const byProducer = new Map<string, Song[]>()
  songs.forEach((s) => byProducer.set(s.producer, [...(byProducer.get(s.producer) ?? []), s]))
  return [...byProducer.values()]
    .filter((g) => g.length > 1)
    .flatMap((g) => g.slice(1).map((s, i) => [g[i] as Song, s] as [Song, Song]))
})()
