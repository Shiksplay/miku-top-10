# Miku, en dix morceaux

Site vitrine expérimental (fan-made, non officiel) : le **Top 10 des chansons de Hatsune Miku**, du n°10 au n°1. Visuels 100 % génératifs (shaders, particules), verre liquide, typographie cinétique « vibrato ».

**En ligne : https://miku-top-10.vercel.app**. Chaque push sur `main` redéploie automatiquement en production (Vercel, intégration GitHub).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (SSG : `/` + 10 pages `/morceau/[slug]`) |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint (config `next/core-web-vitals` + TypeScript) |
| `npm run typecheck` | `tsc --noEmit` (TypeScript strict + `noUncheckedIndexedAccess`) |

Forcer un mode pour tester : `?mode=full`, `?mode=lite` ou `?mode=reduced`.

## Stack et matrice de compatibilité

| Paquet | Version | Pourquoi cette version |
|---|---|---|
| next | 15.5 (App Router) | Imposé |
| react / react-dom | **19.2.x** | `@react-three/fiber@9.7` exige `react >=19 <19.3` |
| @react-three/fiber | 9.7 | v9 obligatoire avec React 19 et l'App Router (v8 incompatible) |
| @react-three/drei | 10.7 | Compatible R3F 9 |
| @react-three/postprocessing / postprocessing | 3.1 / 6.39 | postprocessing exige `three < 0.187` |
| three | **0.186** | ≥ 0.158, < 0.187 |
| @shadergradient/react | 2.4 (+ three-stdlib, camera-controls) | Fonds en dégradé shader |
| tailwindcss | 4.3 | Tokens via `@theme` |
| framer-motion, lenis, gsap | 13 / 1.3 / 3.15 | Transitions, smooth-scroll, ScrollTrigger |
| html2canvas-pro | 2.4 | Capture pour le verre liquide (voir hypothèses) |
| typescript | 5.9 | La v7 (native) n'expose pas l'API utilisée par Next 15 |

## Architecture

```
app/
  layout.tsx            polices (next/font), métadonnées, script pré-paint (mode, easter egg)
  page.tsx              accueil
  morceau/[slug]/       10 pages SSG partageables (détail ouvert au chargement)
  globals.css           design system (tokens @theme), couches, verre CSS, mode réduit
components/
  Experience.tsx        composition : 2 grands pans « Le classement » / « L'univers Miku »
  LazyOverlays.tsx      détail, lecteur, easter egg (chargés à la demande)
  loader/               écran de chargement + renderer WebGL brut (liquid-logo porté)
  hero/                 hero + titre cinétique « vibrato » (sans CLS)
  ranking/              classement, rangée, mini piano-roll, visuel CSS de repli
  detail/               vue détail (dialogue accessible) + synchro URL
  universe/             texte + constellation 3D (étiquettes = vrais boutons)
  layout/               header, footer, mini-lecteur sticky
  glass/                GlassSurface (wrapper React) + liquid-glass/ (port TS)
  webgl/                WebglLayers, Backdrop (ShaderGradient), Stage (canvas R3F unique),
                        StageView, scenes/ (blob, logo, art des cartes, constellation, détail)
data/songs.ts           données typées (classement, signatures chromatiques, liens)
lib/                    store (zustand), capacité/mode, tokens, registre de vues, ticker, scroll
docs/DESIGN-SYSTEM.md   tokens couleur / typo / espacement / mouvement / verre
```

## Choix techniques

### Budget WebGL : au plus 3 contextes

| # | Contexte | Contenu |
|---|---|---|
| 1 | `Backdrop` | **Un seul** `ShaderGradientCanvas`, fond fixe de toute la page. Ses couleurs sont interpolées vers la signature du morceau actif en écrivant directement dans les uniforms compilés, sans re-render (qui recréerait le matériau). En vue détail : signature complète du morceau (`type`, `cDistance`, `cPolarAngle`…), avec un fondu court. |
| 2 | `Stage` | **Un seul** `<Canvas>` R3F. Toutes les scènes sont des `View` drei : blob du hero, logo métal liquide, art des 10 cartes, visualiseur, constellation. En vue détail, mode exclusif avec `EffectComposer` (Bloom + ChromaticAberration). |
| 3 | `GlassEngine` | **Un seul** contexte pour toutes les surfaces de verre. |

Autres garde-fous :
- **Loader** : canvas WebGL brut (sans three.js), détruit à la fin avec `WEBGL_lose_context`.
- **Scènes hors écran** : `StageView` observe sa zone (IntersectionObserver) et n'enregistre la scène que près du viewport. Le canvas ne rend aucune frame quand aucune vue n'est montée.
- **Registre de vues** : les composants DOM déclarent une vue par clé de scène, sans importer three.js. Three, R3F, drei et shadergradient passent par `next/dynamic({ ssr: false })` et restent **hors du bundle initial**.
- **Horloge partagée** : le canvas R3F est en `frameloop="never"` et avancé depuis le ticker GSAP, juste après `lenis.raf`. Le WebGL ne « flotte » pas d'une frame derrière le DOM pendant le scroll.

### liquid-glass-js : port et non dépendance npm

Le paquet npm `liquid-glass-js` **n'est pas** celui de dashersw (autre auteur). Le code MIT de dashersw est donc porté en TypeScript dans `components/glass/liquid-glass/`, en conservant l'API `Container` / `Button` et les paramètres (`borderRadius`, `type`, `tintOpacity`, `warp`, `edgeIntensity`, `rimIntensity`, `blurRadius`…). Adaptations nécessaires :
- l'original ouvre **un contexte WebGL par instance**. Ici un moteur partagé rend chaque surface, puis copie le résultat dans un canvas 2D ;
- deux couches composées dans le shader : **DOM** (capture html2canvas, coordonnées document) et **fixe** (copie du canvas ShaderGradient, coordonnées viewport, ~6 Hz). Le verre reste juste pendant le scroll, même sur les éléments `position: fixed` ;
- **html2canvas uniquement au scroll-end et au resize** (debounce + `requestIdleCallback`), jamais par frame, et seulement si le scroll sort de la marge capturée (viewport ± 0,75 écran) ;
- l'accessibilité reste côté React (vrais `<button>`, `<a>`, `<nav>`). La lib d'origine créait des `div` cliquables ;
- `destroy()` libère tout (écouteurs, observers, instances).

`GlassSurface` est le wrapper React : `"use client"`, `useRef` + `useEffect` pour instancier, cleanup au démontage, verre imbriqué via contexte (bouton play en `warp` dans la pilule du lecteur), halo au survol et au focus.

### liquid-logo : port du shader

`components/webgl/shaders/liquidMetal.ts` porte `fragment-shader.glsl` : détection de contours, champ vectoriel itératif, bruit de Simplex 3D, compression tanh et reflets métalliques. Le résultat est rethématisé dans la palette (void → teal profond → teal → papier, reflet rose). Le même GLSL sert :
1. au **loader** (WebGL brut) : le « 39 » se remplit de métal liquide au rythme de la progression réelle, puis rejoint le header (FLIP) ;
2. au **logo du header** (ShaderMaterial R3F dans le canvas mutualisé).

« 39 » se lit mi-ku, ou san-kyū, « merci » : un clin d'œil des fans. Ce n'est pas un logo officiel.

### Autres

- **Blob du hero** : metaballs 2D à une tête et deux traînes (Verlet), noyau `(r²/d²)²`, ombrage métal liquide depuis le gradient analytique du champ. Le titre passe en `mix-blend-mode: difference` au-dessus : il s'inverse là où le métal passe.
- **Titre « vibrato »** : l'axe `wdth` ondule près du curseur. Les lettres ont une largeur fixe en `em` (avances mesurées) et le recentrage se fait en `transform`, donc **aucun layout shift**.
- **Visualiseur des cartes** : spectre **synthétique** calé sur un tempo artistique. Aucun audio n'est hébergé ni lu.
- **Vue détail** : URL `/morceau/[slug]` via `history.pushState` (intégré au routeur Next 15), sans navigation. Le canvas n'est pas remonté, et le bouton retour du navigateur ferme le détail.

## Le « mode allégé »

Il est repérable dans le code par les commentaires `MODE ALLÉGÉ`. Détection dans `lib/capability.ts`, mode effectif dans `lib/store.ts`.

| | complet (desktop) | allégé (mobile / machine modeste) | réduit (`prefers-reduced-motion` ou toggle) |
|---|---|---|---|
| Fond | ShaderGradient, DPR ≤ 1 | ShaderGradient, `pixelDensity` 0,5 | Dégradé CSS statique |
| Canvas R3F | DPR 1–1,75, antialias | DPR 1–1,25, sans antialias | Aucun |
| Chargement WebGL | Pendant le loader | Après la 1re interaction ou 6 s | Jamais |
| Scènes lourdes | Tout | Pas de constellation 3D, pas de visualiseur, pas de post-process | Liste statique, visuels CSS |
| Particules | 620 pétales, 9 000 points… | ÷ 3 à 4 | Aucune |
| Verre | WebGL (liquid-glass) | CSS `backdrop-filter` | CSS |
| Smooth-scroll | Lenis | Lenis (tactile natif) | Natif |

Le toggle « Réduire les animations » (header et footer) suit la préférence OS et mémorise le choix explicite. Le mode est appliqué **avant le premier rendu** par un script inline, sans flash d'animation.

## Performances mesurées

Lighthouse 12, build de production (`next start`), Chrome headless local :

| Profil | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Mobile (simulé, 4× CPU, 4G lente) | **92** | **100** | **100** | **100** | 2,6 s* | 220 ms | 0,001 |
| Desktop | **99** | **100** | **100** | **100** | 0,8 s | 80 ms | 0,014 |

\* Le LCP mobile **simulé** (Lantern) compte le téléchargement et l'exécution de tout le JS demandé avant le LCP. Le LCP **observé** sur la même trace est de 0,2 s. Le paragraphe du hero est rendu côté serveur et peint dès le premier rendu. Leviers déjà appliqués : CSS 127 Ko → 32 Ko, JS initial 170 Ko → 125 Ko (framer-motion sorti du rendu initial), polices non préchargées.

Framerate mesuré en headless sur le **GPU intégré** (Intel UHD, cas défavorable) : hero ~65–72 fps, classement au survol ~52–58 fps, vue détail avec bloom ~53–56 fps.

### Points d'attention perf

- Garder `preserveDrawingBuffer` **uniquement** sur le canvas de fond (nécessaire pour que le verre le lise), jamais sur le canvas R3F : les vues transparentes y laisseraient des traînées.
- Toute nouvelle scène 3D passe par `StageView` + le registre (`lib/stage-registry.ts`). Ne jamais ajouter de `<Canvas>`.
- Toute nouvelle surface de verre passe par `GlassSurface`. Au-delà d'une dizaine de surfaces visibles simultanément, préférer la variante CSS.
- Le texte du hero et le titre cinétique doivent garder des largeurs fixes (`ADVANCE` dans `KineticTitle.tsx`) si l'on change de police ou de libellé : remesurer les avances.
- En dev, la première compilation des chunks three.js est lente (le loader peut rester longtemps). Le build de production n'a pas ce problème.

## Accessibilité (vérifiée)

- HTML sémantique, landmarks (`header`, `nav`, `main`, `footer`), lien d'évitement, titres hiérarchisés.
- Navigation clavier complète, testée : ordre de tabulation, anneau de focus visible partout.
- Détail en `role="dialog"` + `aria-modal` : focus initial sur le titre, focus piégé, Échap pour fermer, retour du focus au déclencheur, reste de la page en `inert`.
- Contrastes AA vérifiés sur les pixels réels du verre, pour les 10 morceaux, en verre WebGL comme CSS.
- Texte alternatif descriptif pour chaque visuel génératif (`artAlt`), `aria-hidden` sur tout le décoratif.
- Constellation : chaque étoile a un vrai bouton étiqueté, avec une liste statique en mode allégé ou réduit.

## Contraintes légales et éditoriales

- Aucune illustration, aucun logo, aucune pochette officielle. Tous les visuels sont génératifs et abstraits.
- Aucun fichier audio ni aucune parole hébergés. Les liens « Écouter » ouvrent une **recherche** sur YouTube, Spotify ou niconico.
- Mentions dans le footer, licences dans `THIRD_PARTY_NOTICES.md`.

## Hypothèses documentées

1. **liquid-glass-js** : porté depuis le dépôt dashersw (MIT), le paquet npm homonyme étant d'un autre auteur.
2. **html2canvas-pro** au lieu de html2canvas 1.4.1 : Tailwind v4 génère des couleurs `oklab()` / `color-mix()` que html2canvas 1.4.1 ne sait pas analyser. Le fork a une API identique.
3. **Liens d'écoute** : des recherches plutôt que des ID de vidéos, pour ne jamais publier de lien inventé ou mort. Remplacez `listen[].href` dans `data/songs.ts` par les URL officielles exactes si vous les avez.
4. **Mesmerizer** : le brief indiquait « Sat/3ano ». Le titre est crédité à **サツキ (Satsuki), 2024**, en duo avec Kasane Teto. À vérifier si vous aviez une autre source.
5. **cosMo@BurstP** : affiché sous sa forme d'origine, **cosMo@暴走P** (Bousou-P).
6. **Tempo** des animations : valeur artistique, jamais affichée (les BPM exacts ne sont pas publiés ici).
7. **Titres japonais** : police système, plutôt qu'une webfont CJK (≈ 120 `@font-face` bloquants).
