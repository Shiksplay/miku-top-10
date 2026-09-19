# Design system : « Miku, en dix morceaux »

Les tokens existent en double, et les deux sources doivent rester synchronisées :
- **CSS** : `app/globals.css`, bloc `@theme` (utilitaires Tailwind v4) et variables `:root` ;
- **JS** : `lib/tokens.ts`, pour les shaders, les canvas 2D et le verre liquide.

## Concept

Miku est une **voix de synthèse**. Le langage visuel reprend celui de l'éditeur VOCALOID :
- **vibrato typographique** : l'axe `wdth` de la police variable ondule près du curseur, comme une note tenue ;
- **piano-roll** : grille de fond du classement, et mini-roll qui place l'année de chaque titre sur l'échelle 2007–2024 ;
- **couleur de voix** : chaque morceau a sa signature chromatique, que prend toute la page (fond ShaderGradient, accent `--song`) pendant le passage sur ce titre.

Un seul élément « fort » par écran : le blob à deux traînes dans le hero, la scène 3D dans le détail. Tout le reste reste discipliné.

Le blob partage la matière du logo « 39 » : la même fonction de métal liquide. Sa silhouette tient en une tête et deux mèches effilées, continues (jamais des chapelets de billes), qui pendent comme des couettes au repos et filent derrière la tête en mouvement. Sa matière doit garder un fort contraste de luminance (zones sombres, teal saturé, reflets papier), pour que le titre en `difference` s'inverse en cramoisi ou en noir, jamais en gris moyen.

## Couleurs

| Token | Hex | Rôle | Contraste sur `void` |
|---|---|---|---|
| `void` | `#0B0F0E` | Fond de base (quasi noir) | — |
| `void-raised` | `#121816` | Surfaces opaques rares | — |
| `paper` | `#F4F3F1` | Texte principal | 17,4:1 (AAA) |
| `ash` | `#9DA6A4` | Texte secondaire, libellés | 7,7:1 (AAA) |
| `teal` | `#39C5BB` | Accent néon dominant (teal Miku) | 9,1:1 |
| `teal-deep` | `#0E3B38` | Profondeur des dégradés | décoratif |
| `pink` | `#F0468F` | CTA et états de survol uniquement | 5,5:1 (AA) |

- **Accent effectif** : `--accent = hsl(175° + --hue-shift, 55 %, 50 %)`. L'easter egg décale légèrement la teinte à chaque rechargement (0°, −9°, +7°, −14°, +12°, −4°, +16°). Les shaders lisent la même valeur via `lib/accent.ts`.
- **Accent du morceau** : `--song`, propriété `@property <color>` interpolée en 0,9 s, pilotée par le classement.
- **Nuances par morceau** (`data/songs.ts → accent`, `gradient.color1-3`) : teal, cyan et magenta uniquement. Chaque `accent` dépasse 4,5:1 sur `void`.
- **Texte sur verre** : audit par échantillonnage des pixels réels (script de QA), ≥ 4,5:1 pour `ash` et ≥ 8,5:1 pour `paper` sur les dix cartes, en verre WebGL comme en verre CSS.
- **CTA** : texte `void` sur `pink`, soit 5,5:1.

## Typographie

| Rôle | Police | Réglages |
|---|---|---|
| Affichage (titres cinétiques, numéros) | **Anybody** (variable) | `wdth` 50–150, `wght` 100–900 ; repos `wdth 112 / wght 820` |
| Texte | **Instrument Sans** (variable) | `wdth` 75–100, `wght` 400–700 |
| Japonais (titres originaux, filigrane) | Police système (`--font-jp`) | Hiragino / Yu Gothic / Noto Sans JP, graisse 900 pour le filigrane |

Échelle (Bringhurst : 12 · 14 · 16 · 21 · 24–36 · 36–72 · affichage) :

| Utilitaire | Taille | Interligne |
|---|---|---|
| `text-micro` | 0,75 rem | 1,4 |
| `text-small` | 0,875 rem | 1,5 |
| `text-body` | 1,0625 rem | 1,6 |
| `text-lead` | 1,3125 rem | 1,45 |
| `text-title` | clamp(1,5 → 2,25 rem) | 1,1 |
| `text-heading` | clamp(2,25 → 4,5 rem) | 0,95 |
| `text-display` | clamp(3,5 → 12 rem) | 0,84 |
| `.rank-numeral` | clamp(5,5 → 13 rem) | 0,8 |

Règles :
- les numéros du classement suivent le scroll : `wdth 50 → 100` et `wght 140 → 860` (GSAP ScrollTrigger) ;
- pas de libellés en capitales, pas de monospace pour les données, chiffres tabulaires (`.tabular`) pour les années et les rangs ;
- lignes ≤ 60 caractères (`max-w-[40ch…58ch]`) ;
- titre cinétique : chaque lettre a une largeur figée en `em` (avances mesurées d'Anybody), donc zéro CLS au remplacement de police.

## Espacements et rayons

- Base Tailwind (4 px). Gouttière `--gutter` = clamp(1 rem → 3 rem), section `--space-section` = clamp(6 rem → 13 rem), header `--header-h` = 4,5 rem.
- Rayons, hiérarchisés : `tile` 20 px (visuels), `card` 28 px (cartes de verre), panneau détail 32 px, `pill` pour la navigation, les boutons et le lecteur.
- Cibles tactiles ≥ 44 px (`min-h-11`).
- Retour à l'appui : `scale(0.96)` sur les boutons (CTA du hero, boutons des cartes), avec une transition sur la propriété `scale`. Tailwind v4 compile `scale-*` en `scale`, pas en `transform`.

## Mouvement

| Token | Valeur | Usage |
|---|---|---|
| `--ease-voice` | `cubic-bezier(0.16, 1, 0.3, 1)` | Attaque rapide, relâche longue (sorties, révélations) |
| `--ease-in-out-strong` | `cubic-bezier(0.65, 0, 0.35, 1)` | Transitions symétriques |
| Durées | 240 ms / 600 ms / 1,2 s | Micro / base / orchestration |

Un seul moment orchestré à l'entrée : le logo « 39 » se remplit de métal liquide au rythme du chargement réel, rejoint le header, puis un balayage « chanté » traverse le titre.

## Surfaces de verre

| Mode | Rendu |
|---|---|
| Complet | `liquid-glass` porté (WebGL), `data-glass="webgl"` : réfraction de bord, liseré, flou, teinte, halo au survol et au focus |
| Allégé / réduit / sans WebGL | `data-glass="css"` : base sombre `rgba(11,15,14,.55)` + `backdrop-filter: blur(18px) saturate(155%)` + liseré intérieur |

Paramètres (API de la lib d'origine) : `borderRadius`, `type` (`rounded` | `circle` | `pill`), `tintOpacity`, `warp` (boutons play), `edgeIntensity`, `rimIntensity`, `baseIntensity`, `edgeDistance`, `rimDistance`, `baseDistance`, `cornerBoost`, `rippleEffect`, `blurRadius`. Deux ajouts : `refraction` (amplitude en px) et `darken` (plancher de lisibilité).

## Miniatures officielles

Pour les morceaux dont la vidéo YouTube officielle est vérifiée (voir `data/songs.ts`).

| Règle | Valeur |
|---|---|
| Visuel par défaut | La scène générative, jamais remplacée au repos |
| Déclencheur | Survol ou focus de la rangée ; sans survol (tactile), rangée active |
| Entrée | Fondu « liquide » : seuil qui avance sur le bruit fbm de la scène, liseré à la couleur `color1` du morceau, ~0,8 s |
| Sortie | Même fondu, inversé et plus court (~0,5 s) |
| Visualiseur | Base assombrie surtout en bas (×0,36 → ×0,95), pour que la miniature reste lisible |
| Recadrage | « cover » centré dans la tuile 4:5, zone utile 16:9 (bandes noires d'une miniature 4:3 exclues) |
| Contour | `ring-white/10`, puis `ring-white/30` au survol : blanc pur, jamais un blanc teinté |
| Rayon | `tile` 20 px, appliqué aussi au WebGL par découpe dans le shader (parallax compris) |
| Repli CSS | Même révélation en opacité (0,6 s à l'entrée, 0,3 s à la sortie), visible d'emblée sans survol |

## Focus et accessibilité

- Focus : double anneau (`outline` papier 2 px + halo teal 6 px), lisible sur le verre comme sur les shaders.
- Les cibles de focus programmatique (`tabindex="-1"`, titres) n'affichent pas d'anneau.
- `prefers-reduced-motion` et toggle manuel : `html[data-motion="reduced"]`, fixé avant le premier rendu.

## Couches (z-index)

| Couche | z | Contenu |
|---|---|---|
| `.layer-static` | −3 (38 en détail) | Dégradé CSS |
| `.layer-backdrop` | −2 (39 en détail) | ShaderGradient |
| `.layer-stage` | −1 (40 en détail) | Canvas R3F mutualisé |
| Contenu | auto | Page |
| Lecteur | 40 | Mini-lecteur |
| Détail | 45 | Dialogue |
| Header | 50 | Navigation |
| Loader | 80 | Écran de chargement |
