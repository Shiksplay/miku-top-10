import { color, hexToRgb01 } from '@/lib/tokens'
import { hash, simplex3 } from './noise'

/**
 * Port de fragment-shader.glsl de collidingScopes/liquid-logo (MIT, Alan Ang).
 *
 * On conserve la technique d'origine :
 *   1. détection de contours du logo (différences de texels voisins),
 *   2. champ vectoriel itératif (boucle cos/sin) dévié par les contours,
 *   3. bruit de Simplex 3D qui fait couler la matière à l'intérieur du logo,
 *   4. compression tanh + reflets métalliques le long des arêtes.
 *
 * Adaptations :
 *   - fonction pure `liquidMetal(uv, res)` réutilisée par le loader (WebGL brut)
 *     et par le logo du header (ShaderMaterial R3F) ;
 *   - « rethématisation » : la luminance du motif d'origine est projetée sur une rampe
 *     void → teal profond → teal → papier, avec un reflet rose sur les arêtes ;
 *   - uReveal : balayage d'apparition (loader) ; uPointer : décale le reflet principal.
 */
export const liquidMetalChunk = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uIterations;
uniform float uScale;
uniform float uDotFactor;
uniform float uVOffset;
uniform float uIntensityFactor;
uniform float uExpFactor;
uniform vec3 uColorFactors;
uniform float uColorShift;
uniform float uDotMultiplier;
uniform float uNoiseIntensity;
uniform float uInteract;
uniform sampler2D uLogo;
uniform vec2 uLogoTexel;
uniform vec3 uVoid;
uniform vec3 uDeep;
uniform vec3 uTeal;
uniform vec3 uPaper;
uniform vec3 uPink;
uniform float uThemeMix;
uniform float uReveal;
uniform vec2 uPointer;

${simplex3}
${hash}

float detectEdges(vec2 uv, float threshold) {
  vec2 d = uLogoTexel * 1.5;
  vec4 c = texture2D(uLogo, uv);
  vec4 l = texture2D(uLogo, uv - vec2(d.x, 0.0));
  vec4 r = texture2D(uLogo, uv + vec2(d.x, 0.0));
  vec4 t = texture2D(uLogo, uv - vec2(0.0, d.y));
  vec4 b = texture2D(uLogo, uv + vec2(0.0, d.y));
  float diff = length(c - l) + length(c - r) + length(c - t) + length(c - b);
  return smoothstep(0.0, threshold, diff);
}

vec3 metalRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(uVoid, uDeep, smoothstep(0.02, 0.32, t));
  c = mix(c, uTeal, smoothstep(0.28, 0.66, t));
  c = mix(c, uPaper, smoothstep(0.74, 0.98, t));
  return c;
}

vec4 liquidMetal(vec2 uv, vec2 res) {
  vec4 logo = texture2D(uLogo, uv);
  float logoAlpha = logo.a;
  if (logoAlpha < 0.01) return vec4(0.0);

  float time = uTime * uSpeed;
  float edge = detectEdges(uv, 0.2) * uInteract;

  vec2 FC = uv * res;
  vec2 p = (FC * 2.0 - res) / res.y;
  vec2 l = vec2(0.0);
  float dotP = dot(p, p);
  l.x += abs(uDotFactor - dotP) * uDotMultiplier;

  float edgeInfluence = edge * 20.0;
  vec2 v = p * (1.0 - l.x) / uScale;
  v += vec2(sin(edge * 10.0), cos(edge * 8.0)) * edgeInfluence;

  float flowNoise = snoise(vec3(p * 2.0, time * 0.15)) * uNoiseIntensity;
  v += vec2(flowNoise, flowNoise * 0.7);

  vec4 o = vec4(0.0);
  for (float i = 0.0; i < 16.0; i++) {
    if (i >= uIterations) break;
    float idx = i + 1.0;
    vec2 offset = cos(v.yx * idx + vec2(0.0, idx) + time) / idx + uVOffset;
    if (edge > 0.1) offset *= 1.0 + edge * 4.0;
    v += offset;
    o += (sin(vec4(v.x, v.y, v.y, v.x)) + 1.0) * abs(v.x - v.y) * uIntensityFactor;
  }

  if (uColorShift > 0.0) o = o.wxyz * uColorShift + o * (1.0 - uColorShift);

  vec4 expPy = exp(p.y * vec4(uColorFactors, 0.0));
  float expLx = exp(-uExpFactor * l.x);
  vec4 ratio = expPy * expLx / max(o, vec4(1e-4));
  vec4 exp2x = exp(2.0 * clamp(ratio, -8.0, 8.0));
  o = (exp2x - 1.0) / (exp2x + 1.0);

  float grain = hash21(FC / 1.5 + time * 0.0004) * 0.12 - 0.075;
  o += vec4(grain);

  // Reflet métallique d'origine (liquidMetalEffect)
  float highlight = pow(0.5 + 0.5 * sin(edge * 6.0), 8.0) * edge;
  o.rgb += highlight * vec3(0.4, 0.3, 0.5);
  o = clamp(o, 0.0, 1.0);

  // Rethématisation dans la palette du site
  float lum = dot(o.rgb, vec3(0.299, 0.587, 0.114));
  float sheen = 0.5 + 0.5 * sin(p.x * 2.2 + p.y * 1.4 - time * 0.9 + uPointer.x * 1.5);
  vec3 themed = metalRamp(lum * 0.92 + sheen * 0.18);
  vec3 col = mix(o.rgb, themed, uThemeMix);
  float rim = pow(edge * 1.2, 4.0);
  col += rim * mix(uPaper, uPink, 0.35 + 0.35 * sin(time + p.x * 3.0));
  col = mix(col * 0.8 + 0.2 * uTeal, col, 0.7);

  // Balayage d'apparition : la matière « coule » de gauche à droite
  float sweep = smoothstep(uReveal * 1.35 - 0.3, uReveal * 1.35, uv.x + snoise(vec3(uv * 3.0, time * 0.2)) * 0.06);
  float alpha = smoothstep(0.08, 0.55, logoAlpha) * (1.0 - sweep);
  return vec4(col, alpha);
}
`

/** Paramètres réglés à partir du preset « Liquid » de liquid-logo, calmés pour un logo. */
export const liquidMetalDefaults = {
  uSpeed: 0.36,
  uIterations: 13,
  uScale: 1.49,
  uDotFactor: 0.03,
  uDotMultiplier: 0.66,
  uVOffset: 0.1,
  uIntensityFactor: 0.07,
  uExpFactor: 3.5,
  uColorFactors: [-1.2, 0.6, 0.6] as [number, number, number],
  uColorShift: 0.2,
  uNoiseIntensity: 1.4,
  uInteract: 0.45,
  uThemeMix: 0.72,
}

export const paletteUniforms = () => ({
  uVoid: hexToRgb01(color.void),
  uDeep: hexToRgb01(color.tealDeep),
  uTeal: hexToRgb01(color.teal),
  uPaper: hexToRgb01(color.paper),
  uPink: hexToRgb01(color.pink),
})

/**
 * Dessine la marque « 39 » (mi-ku → san-kyū, « merci » : clin d'œil des fans)
 * dans un canvas 2D qui sert de masque alpha au shader, comme le logo PNG de liquid-logo.
 */
export function drawLogoMask(size = 512): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-anybody').trim() ||
    'Arial Black, sans-serif'
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const withStretch = ctx as CanvasRenderingContext2D & { fontStretch?: string }
  if ('fontStretch' in withStretch) withStretch.fontStretch = 'ultra-expanded'
  ctx.font = `900 ${Math.round(size * 0.66)}px ${family}`
  ctx.fillText('39', size / 2, size * 0.54)
  return canvas
}
