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

## Marque et contenus

Hatsune Miku est une création et une marque de Crypton Future Media, INC. Ce site de fan n'utilise ni illustration, ni logo, ni pochette officielle, et n'héberge ni audio ni paroles.
