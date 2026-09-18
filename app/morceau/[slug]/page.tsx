import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Experience } from '@/components/Experience'
import { songBySlug, songs } from '@/data/songs'

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return songs.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const song = songBySlug(slug)
  if (!song) return {}
  return {
    title: `${song.title} (n°${song.rank})`,
    description: `${song.title}, ${song.producer} (${song.year}). ${song.hook}`,
    openGraph: { title: `${song.title}, n°${song.rank} du Top 10 Miku`, description: song.hook },
  }
}

/** Page partageable d'un morceau : même expérience, détail ouvert au chargement. */
export default async function SongPage({ params }: Params) {
  const { slug } = await params
  if (!songBySlug(slug)) notFound()
  return <Experience initialSlug={slug} />
}
