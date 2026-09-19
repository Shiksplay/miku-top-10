import { hash, simplex3 } from './noise'

/**
 * Art génératif des cartes : un flux de couleur (fbm à domaine déformé) dans la
 * signature du morceau, plus un motif abstrait qui évoque le titre. La scène elle-même
 * n'emploie aucune iconographie officielle, uniquement des formes géométriques.
 *
 * Miniature officielle (morceaux dont la vidéo a été vérifiée, voir data/songs.ts) : au survol,
 * elle remplace la scène par un fondu « liquide », un seuil qui avance sur le même bruit fbm,
 * avec un liseré à la couleur du morceau. La scène reste le visuel par défaut.
 */
export const cardArtFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uKind;
uniform float uHover;
uniform float uTempo;
uniform float uSeed;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform sampler2D uCover;
uniform float uCoverMix;
uniform vec4 uCoverRect;
uniform float uCoverAspect;
uniform vec4 uClip;
uniform float uRadius;
${simplex3}
${hash}

float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * snoise(p); p *= 2.03; a *= 0.5; }
  return s;
}

vec2 voronoi(vec2 x) {
  vec2 n = floor(x), f = fract(x);
  float md = 8.0, md2 = 8.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(hash21(n + g), hash21(n + g + 17.3));
    o = 0.5 + 0.45 * sin(uTime * 0.4 + 6.2831 * o);
    float d = length(g + o - f);
    if (d < md) { md2 = md; md = d; } else if (d < md2) { md2 = d; }
  }
  return vec2(md, md2 - md);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.22 * uTempo + uSeed;
  int k = int(uKind + 0.5);

  // Glitch (Ghost Rule) : décalage horizontal par bandes
  if (k == 7) {
    float band = floor(uv.y * 26.0);
    float tick = floor(uTime * 5.0 * uTempo);
    float on = step(0.82, hash21(vec2(band, tick)));
    p.x += (hash21(vec2(band * 3.1, tick)) - 0.5) * 0.14 * on;
  }
  // Pixellisation (chiptune / dissolution)
  if (k == 9) p = floor(p * 26.0) / 26.0;
  if (k == 5) p = floor(p * 60.0) / 60.0;

  vec2 q = vec2(fbm(vec3(p * 1.3, t)), fbm(vec3(p * 1.3 + 3.7, t)));
  float n = fbm(vec3(p * 1.6 + q * 1.25, t * 0.7));
  vec3 col = mix(uC3, uC2, smoothstep(-0.45, 0.45, n));
  col = mix(col, uC1, smoothstep(0.1, 0.8, n + q.x * 0.35));

  float r = length(p);
  float a = atan(p.y, p.x);
  float motif = 0.0;

  if (k == 0) {            // cristal à facettes
    vec2 v = voronoi(p * 5.0 + q);
    motif = 1.0 - smoothstep(0.0, 0.05, v.y);
    motif += pow(1.0 - v.x, 12.0) * 0.8;
  } else if (k == 1) {     // fonte : coulures verticales
    float c = floor(uv.x * 16.0);
    float h = hash21(vec2(c, 3.0));
    float y = fract(uv.y * 0.6 + uTime * 0.05 * (0.4 + h) * uTempo);
    float stem = 1.0 - smoothstep(0.1, 0.18, abs(fract(uv.x * 16.0) - 0.5));
    motif = stem * smoothstep(0.35, 1.0, y) * smoothstep(0.55, 0.9, h + 0.3);
  } else if (k == 2) {     // pétales en tourbillon
    vec2 g = p * 6.0;
    g += vec2(sin(t * 2.0 + g.y), cos(t * 1.6 + g.x)) * 0.4;
    vec2 cell = floor(g);
    vec2 f = fract(g) - 0.5;
    float ang = hash21(cell) * 6.2831 + uTime * 0.6;
    f = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * f;
    float petal = length(f * vec2(1.0, 2.1));
    motif = (1.0 - smoothstep(0.16, 0.2, petal)) * step(0.45, hash21(cell + 9.1));
  } else if (k == 3) {     // anneaux qui roulent, traînées
    float s = sin((p.x * 1.2 + p.y) * 22.0 - uTime * 6.0 * uTempo);
    motif = smoothstep(0.85, 1.0, s) * (0.4 + 0.6 * smoothstep(0.1, 0.6, q.y + 0.5));
    motif += 1.0 - smoothstep(0.012, 0.03, abs(fract(r * 3.0 - uTime * 0.8 * uTempo) - 0.5) * 0.2);
  } else if (k == 4) {     // pois qui rebondissent (polka)
    vec2 g = uv * vec2(7.0, 9.0);
    float colId = floor(g.x);
    g.y += abs(sin(uTime * 2.4 * uTempo + colId * 0.8)) * 0.45;
    vec2 f = fract(g) - 0.5;
    motif = 1.0 - smoothstep(0.2, 0.24, length(f));
  } else if (k == 5) {     // dissolution numérique
    float d = fbm(vec3(p * 5.0, uTime * 0.25));
    float th = sin(uTime * 0.7 * uTempo) * 0.35;
    motif = step(d, th) * 0.9;
    col = mix(col, uC3, step(d, th - 0.08));
  } else if (k == 6) {     // réseau / globe
    float lat = abs(sin(p.y * 22.0));
    float lon = abs(sin(asin(clamp(p.x / max(sqrt(1.0 - p.y * p.y * 3.0), 0.2), -1.0, 1.0)) * 7.0 + uTime * 0.4));
    float globe = 1.0 - smoothstep(0.42, 0.44, r);
    motif = globe * ((1.0 - smoothstep(0.0, 0.08, lat)) + (1.0 - smoothstep(0.0, 0.08, lon))) * 0.6;
    vec2 cell = floor(p * 9.0);
    float node = step(0.8, hash21(cell)) * (1.0 - smoothstep(0.06, 0.1, length(fract(p * 9.0) - 0.5)));
    motif += node * (0.6 + 0.4 * sin(uTime * 3.0 + hash21(cell) * 20.0)) * globe;
  } else if (k == 7) {     // spectre parasité
    motif = step(0.94, fract(uv.y * 90.0)) * 0.35;
    motif += (1.0 - smoothstep(0.0, 0.25, abs(snoise(vec3(p * 3.0, uTime * 0.5))))) * 0.35;
  } else if (k == 8) {     // spirale hypnotique
    float s = sin(a * 3.0 + log(r + 0.02) * 9.0 - uTime * 2.2 * uTempo);
    motif = smoothstep(0.3, 1.0, s) * (1.0 - smoothstep(0.45, 0.75, r));
  } else if (k == 9) {     // égaliseur 8-bit
    float colId = floor(uv.x * 14.0);
    float h = 0.25 + 0.6 * abs(sin(uTime * 1.8 * uTempo + colId * 0.9)) * hash21(vec2(colId, floor(uTime * 2.0 * uTempo)));
    float cellY = fract(uv.y * 20.0);
    motif = step(uv.y, h) * step(0.18, cellY) * step(0.16, fract(uv.x * 14.0)) * 0.9;
  }

  vec3 glow = mix(uC1, vec3(1.0), 0.35);
  col = mix(col, glow, clamp(motif, 0.0, 1.0) * 0.75);

  float vig = smoothstep(1.15, 0.2, length((uv - 0.5) * vec2(1.1, 1.0)));
  col *= 0.55 + 0.45 * vig;

  if (uCoverMix > 0.001) {
    // Recadrage « cover » dans la zone utile de la miniature (hors bandes noires éventuelles),
    // avec un léger remous qui se pose quand la miniature est entièrement révélée.
    vec2 fit = aspect < uCoverAspect ? vec2(aspect / uCoverAspect, 1.0) : vec2(1.0, uCoverAspect / aspect);
    vec2 cuv = 0.5 + (uv - 0.5) * fit + q * 0.02 * (1.0 - uCoverMix);
    cuv = mix(uCoverRect.xy, uCoverRect.zw, clamp(cuv, 0.0, 1.0));
    vec3 cover = texture2D(uCover, cuv).rgb * (0.82 + 0.18 * vig);
    float front = mix(-0.25, 1.25, uCoverMix);
    float reveal = smoothstep(front - 0.1, front + 0.1, 0.5 + 0.5 * n);
    reveal = 1.0 - reveal;
    col = mix(col, cover, reveal);
    col += glow * reveal * (1.0 - reveal) * 2.4;
  }

  col += (hash21(uv * uRes + fract(uTime)) - 0.5) * 0.035;
  // Au survol, la base s'assombrit pour le visualiseur ; avec une miniature, surtout en bas.
  float dim = mix(0.42, mix(0.36, 0.95, smoothstep(0.08, 0.75, uv.y)), uCoverMix);
  col *= mix(1.0, dim, uHover);

  // Découpe au rectangle arrondi réel de la tuile : la vue R3F est un rectangle (scissor),
  // décalé par le parallax ; sans cela ses coins carrés dépassent de l'arrondi CSS.
  vec2 px = vUv * uRes;
  vec2 q2 = abs(px - (uClip.xy + uClip.zw) * 0.5) - (uClip.zw - uClip.xy) * 0.5 + uRadius;
  float dClip = length(max(q2, 0.0)) + min(max(q2.x, q2.y), 0.0) - uRadius;
  float alpha = clamp(0.5 - dClip, 0.0, 1.0);
  if (alpha <= 0.0) discard;
  gl_FragColor = vec4(col, alpha);
}
`
