# Notices tierces

Ce projet **porte** (réécrit en TypeScript et adapte) du code issu de deux dépôts sous licence MIT. Ces dépôts ne sont pas installés via npm. Les autres bibliothèques (Next.js, React Three Fiber, drei, postprocessing, @shadergradient/react, Lenis, GSAP, framer-motion, html2canvas-pro) sont des dépendances npm, chacune sous sa propre licence.

---

## dashersw/liquid-glass-js

- Source : https://github.com/dashersw/liquid-glass-js (commit `78cb6ccb`, 2025-06-12)
- Portage : `components/glass/liquid-glass/` (`shaders.ts`, `engine.ts`, `Container.ts`, `Button.ts`)
- Modifications : contexte WebGL unique partagé, couche DOM + couche fixe composées, forme explicite, dégradé échantillonné calculé côté CPU, noyau de flou réduit, thématisation, API rattachée à des éléments existants, `destroy()`.

```
MIT License

Copyright (c) 2025 Armagan Amcalar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## collidingScopes/liquid-logo

- Source : https://github.com/collidingScopes/liquid-logo (commit `c733c38a`, 2025-03-06)
- Portage : `components/webgl/shaders/liquidMetal.ts` (logique de `fragment-shader.glsl`), utilisé par `components/loader/LiquidMetalRenderer.ts` et `components/webgl/scenes/LogoMetal.tsx`.
- Modifications : fonction GLSL réutilisable, rethématisation dans la palette du site, balayage d'apparition, masque « 39 » généré à la volée.

```
MIT License

Copyright (c) 2025 Alan Ang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Bruit de Simplex 3D (webgl-noise)

`components/webgl/shaders/noise.ts` reprend l'implémentation « webgl-noise » d'Ashima Arts et Stefan Gustavson (licence MIT), déjà présente dans liquid-logo.

---

## Capsule inégale 2D (Inigo Quilez)

La distance signée « uneven capsule » (variante à extrémités quelconques) de `components/webgl/scenes/HeroBlob.tsx` reprend la formule publiée par Inigo Quilez : https://iquilezles.org/articles/distfunctions2d/, démo Shadertoy https://www.shadertoy.com/view/4lcBWn, licence MIT, © 2018 Inigo Quilez.

---

## Marque et contenus

Hatsune Miku est une création et une marque de Crypton Future Media, INC. Ce site de fan n'**héberge** ni illustration, ni logo, ni pochette officielle, ni audio, ni paroles. Ses propres visuels sont génératifs.

### Miniatures des vidéos officielles

Pour chacun des 10 morceaux, la carte du classement affiche au survol (ou, sur écran tactile, quand la rangée est active) la **miniature publique de la vidéo officielle** sur YouTube.

- **Source** : l'image est chargée par le navigateur du visiteur directement depuis les serveurs de YouTube (`https://i.ytimg.com/vi/<ID>/maxresdefault.jpg`, ou `hqdefault.jpg` quand c'est la seule taille publiée). Elle n'est jamais copiée, stockée, ré-hébergée ni transformée côté serveur : pas de proxy d'images `next/image`.
- **Affichage** : dans le navigateur seulement. Recadrage centré (et suppression des bandes noires d'une miniature 4:3), fondu depuis la scène générative, visualiseur et grain léger par-dessus.
- **Droits** : chaque miniature reste la propriété de ses ayants droit (producteurs, illustrateurs, Crypton Future Media). Aucune n'est présentée comme un visuel du site.
- **Vérification** : seules sont utilisées des vidéos dont l'ID, le titre et la chaîne éditrice ont été contrôlés via l'oEmbed public de YouTube (vérification du 2026-09-19) : chaîne du producteur, chaîne officielle Hatsune Miku, ou piste fournie à YouTube par Crypton. Le lien « Écouter sur YouTube » de ces morceaux pointe vers cette vidéo exacte. Spotify et niconico restent des recherches.

| Morceau | Vidéo YouTube | Chaîne éditrice |
|---|---|---|
| World is Mine | `jhl5afLEKdo` (captation live officielle) | Hatsune Miku, chaîne officielle de Crypton Future Media |
| Melt | `XRymkHlMB-k` (« Melt CPK! Remix (Hatsune Miku ver.) », remix officiel 2026 ; l'original de 2007 n'est pas officiellement sur YouTube) | ryo (supercell) |
| Senbonzakura | `shs0rAiwsGQ` | WhiteFlame official (Kurousa-P) |
| Rolling Girl | `vnw8zURAxkU` | ヒトリエ / wowaka |
| Ievan Polkka | `z5Ub37hEQFo` (piste audio, miniature = pochette) | Release - Topic, fournie à YouTube par Crypton Future Media (℗ 2019 Otomania / CFM) |
| The Disappearance of Hatsune Miku | `VWVtIg5cdDU` (MV du 10e anniversaire, 2018) | cosMo@暴走P |
| Tell Your World | `PqJNc9KVIZE` | kz-livetune |
| Ghost Rule | `KushW6zvazM` | DECO*27 |
| Mesmerizer | `19y8YTbvri8` | サツキ |
| Miku | `NocXEwsJGOQ` (lyric video) | Hatsune Miku, chaîne officielle de Crypton Future Media |

Cette section va au-delà de la politique initiale « aucun visuel officiel ». Pour y revenir, il suffit de retirer le champ `video` des morceaux dans `data/songs.ts` : les cartes et les liens reviennent alors d'eux-mêmes au génératif et aux recherches.
