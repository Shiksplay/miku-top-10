import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-start justify-center gap-6 px-[var(--gutter)]">
      <p className="font-display text-display" style={{ '--wdth': 60, '--wght': 200 } as React.CSSProperties}>
        404
      </p>
      <h1 className="text-title">Ce morceau n’est pas dans le classement.</h1>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center rounded-full bg-pink px-6 font-semibold text-void transition-colors hover:bg-paper"
      >
        Revenir au classement
      </Link>
    </main>
  )
}
