import type { Song } from '@/data/songs'

/** Visuel CSS statique (mode réduit / sans WebGL) : dégradés dans la signature du morceau. */
export function SongArtFallback({ song }: { song: Song }) {
  const g = song.gradient
  return (
    <span
      className="absolute inset-0 block"
      style={{
        background: `radial-gradient(90% 70% at 28% 22%, ${g.color1} 0%, transparent 62%),
          radial-gradient(80% 70% at 80% 85%, ${g.color2} 0%, transparent 70%),
          radial-gradient(60% 50% at 70% 30%, ${song.accent}55 0%, transparent 70%),
          ${g.color3}`,
      }}
    />
  )
}
