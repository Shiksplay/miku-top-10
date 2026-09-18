import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Un package-lock.json parent (dossier utilisateur) trompe l'inférence de racine.
  outputFileTracingRoot: path.resolve('.'),
  experimental: {
    // Tree-shake les barrel files lourds (drei, postprocessing, framer-motion).
    optimizePackageImports: ['@react-three/drei', '@react-three/postprocessing', 'framer-motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
