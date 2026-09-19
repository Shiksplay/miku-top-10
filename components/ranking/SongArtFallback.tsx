import { coverUrl, type Song } from '@/data/songs'

/**
 * Visuel CSS statique (mode réduit / sans WebGL) : dégradés dans la signature du morceau.
 * Si la vidéo officielle est vérifiée, sa miniature apparaît au survol ou au focus de la rangée
 * (voir .art-cover dans globals.css). Chargée directement depuis YouTube : un <img> natif plutôt
 * que next/image, pour ne jamais passer par le proxy d'images (aucune copie ré-hébergée) et ne pas
 * alourdir le JS initial.
 */
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
    >
      {song.video && (
        // eslint-disable-next-line @next/next/no-img-element -- miniature YouTube, jamais proxifiée
        <img
          src={coverUrl(song.video)}
          alt=""
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
          className="art-cover absolute inset-0 size-full object-cover"
          // Miniature 4:3 à bandes noires : on agrandit pour ne garder que la zone utile 16:9.
          style={song.video.letterbox ? ({ '--cover-zoom': 4 / 3 } as React.CSSProperties) : undefined}
        />
      )}
    </span>
  )
}
