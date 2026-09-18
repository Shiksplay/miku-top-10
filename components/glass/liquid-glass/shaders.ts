/**
 * Shaders portés de dashersw/liquid-glass-js (MIT, © 2025 Armagan Amcalar),
 * container.js + button.js (verre imbriqué).
 *
 * Conservé de l'original : distances de forme (rectangle arrondi / cercle / pilule),
 * normales dépendantes de la forme, réfraction en trois couches (edge / rim / base
 * avec warp central), corner boost, ondulation, flou gaussien, double teinte
 * (dégradé vertical + dégradé échantillonné) et masque de forme.
 *
 * Adaptations :
 *  - deux sources composées : la couche DOM (capture html2canvas, coordonnées du
 *    document) et la couche fixe (fond WebGL, coordonnées du viewport). Le verre
 *    reste juste pendant le scroll, même sur les éléments position: fixed ;
 *  - forme passée explicitement (u_shape) au lieu d'être devinée depuis les tailles ;
 *  - dégradé échantillonné calculé côté CPU (u_topColor…) au lieu de 660 lectures
 *    de texture par pixel ; noyau de flou 9×9 au lieu de 13×13 ;
 *  - teintes, assombrissement de lisibilité et halo de survol thématisés ;
 *  - sortie en alpha prémultiplié.
 */
export const glassVertex = /* glsl */ `
attribute vec2 a_position;
attribute vec2 a_texcoord;
varying vec2 v_texcoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texcoord = a_texcoord;
}
`

export const glassFragment = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_image;
uniform sampler2D u_fixed;
uniform vec2 u_resolution;
uniform vec2 u_textureSize;
uniform vec2 u_containerPosition;
uniform vec2 u_viewport;
uniform vec2 u_viewportPosition;
uniform float u_nested;
uniform float u_blurRadius;
uniform float u_borderRadius;
uniform float u_warp;
uniform float u_edgeIntensity;
uniform float u_rimIntensity;
uniform float u_baseIntensity;
uniform float u_edgeDistance;
uniform float u_rimDistance;
uniform float u_baseDistance;
uniform float u_cornerBoost;
uniform float u_rippleEffect;
uniform float u_tintOpacity;
uniform float u_shape;
uniform float u_refraction;
uniform float u_darken;
uniform float u_highlight;
uniform vec3 u_highlightColor;
uniform vec3 u_topColor;
uniform vec3 u_midColor;
uniform vec3 u_bottomColor;
uniform vec3 u_tintTop;
uniform vec3 u_tintBottom;
varying vec2 v_texcoord;

float roundedRectDistance(vec2 coord, vec2 size, float radius) {
  vec2 center = size * 0.5;
  vec2 pixelCoord = coord * size;
  vec2 toCorner = abs(pixelCoord - center) - (center - radius);
  float outsideCorner = length(max(toCorner, 0.0));
  float insideCorner = min(max(toCorner.x, toCorner.y), 0.0);
  return (outsideCorner + insideCorner - radius);
}

float circleDistance(vec2 coord, vec2 size, float radius) {
  vec2 pixelCoord = coord * size;
  return length(pixelCoord - size * 0.5) - radius;
}

float pillDistance(vec2 coord, vec2 size, float radius) {
  vec2 center = size * 0.5;
  vec2 pixelCoord = coord * size;
  vec2 capsuleStart = vec2(radius, center.y);
  vec2 capsuleEnd = vec2(size.x - radius, center.y);
  vec2 capsuleAxis = capsuleEnd - capsuleStart;
  float capsuleLength = length(capsuleAxis);
  if (capsuleLength > 0.0) {
    vec2 toPoint = pixelCoord - capsuleStart;
    float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
    return length(pixelCoord - (capsuleStart + t * capsuleAxis)) - radius;
  }
  return length(pixelCoord - center) - radius;
}

float shapeDistance(vec2 coord) {
  if (u_shape > 1.5) return pillDistance(coord, u_resolution, u_borderRadius);
  if (u_shape > 0.5) return circleDistance(coord, u_resolution, u_borderRadius);
  return roundedRectDistance(coord, u_resolution, u_borderRadius);
}

vec3 sampleSource(vec2 offsetPx) {
  vec4 dom = texture2D(u_image, (u_containerPosition + offsetPx) / u_textureSize);
  if (u_nested > 0.5) return dom.rgb;
  vec3 fixedLayer = texture2D(u_fixed, (u_viewportPosition + offsetPx) / u_viewport).rgb;
  return mix(fixedLayer, dom.rgb, dom.a);
}

void main() {
  vec2 coord = v_texcoord;
  vec2 containerOffset = (coord - 0.5) * u_resolution;

  // ---- Réfraction (identique à l'original, forme explicite)
  float distFromEdgeShape = max(-shapeDistance(coord), 0.0);
  vec2 shapeNormal;
  if (u_shape > 1.5) {
    vec2 pixelCoord = coord * u_resolution;
    vec2 capsuleStart = vec2(u_borderRadius, 0.5 * u_resolution.y);
    vec2 capsuleEnd = vec2(u_resolution.x - u_borderRadius, 0.5 * u_resolution.y);
    vec2 capsuleAxis = capsuleEnd - capsuleStart;
    float t = clamp(dot(pixelCoord - capsuleStart, capsuleAxis) / max(dot(capsuleAxis, capsuleAxis), 1e-4), 0.0, 1.0);
    vec2 normalDir = pixelCoord - (capsuleStart + t * capsuleAxis);
    shapeNormal = length(normalDir) > 0.0 ? normalize(normalDir) : vec2(0.0, 1.0);
  } else {
    vec2 d = coord - vec2(0.5);
    shapeNormal = length(d) > 0.0 ? normalize(d) : vec2(0.0, 1.0);
  }

  float minDim = min(u_resolution.x, u_resolution.y);
  float distFromEdge = distFromEdgeShape / minDim;
  float normalizedDistance = distFromEdgeShape;
  float baseIntensity = 1.0 - exp(-normalizedDistance * u_baseDistance);
  float edgeIntensity = exp(-normalizedDistance * u_edgeDistance);
  float rimIntensity = exp(-normalizedDistance * u_rimDistance);
  float baseComponent = u_warp > 0.5 ? baseIntensity * u_baseIntensity : 0.0;
  float totalIntensity = baseComponent + edgeIntensity * u_edgeIntensity + rimIntensity * u_rimIntensity;
  vec2 baseRefraction = shapeNormal * totalIntensity;

  float cornerProximityX = min(coord.x, 1.0 - coord.x);
  float cornerProximityY = min(coord.y, 1.0 - coord.y);
  float cornerNormalized = max(cornerProximityX, cornerProximityY) * minDim;
  vec2 cornerRefraction = shapeNormal * exp(-cornerNormalized * 0.3) * u_cornerBoost;

  vec2 perpendicular = vec2(-shapeNormal.y, shapeNormal.x);
  float ripple = sin(distFromEdge * (u_nested > 0.5 ? 30.0 : 25.0)) * u_rippleEffect * rimIntensity;
  vec2 totalRefraction = baseRefraction + cornerRefraction + perpendicular * ripple;
  vec2 refrPx = totalRefraction * u_refraction;

  // ---- Flou gaussien (noyau circulaire 9×9)
  float sigma = max(u_blurRadius / (u_nested > 0.5 ? 3.0 : 2.0), 0.5);
  vec3 color = vec3(0.0);
  float totalWeight = 0.0;
  for (float i = -4.0; i <= 4.0; i += 1.0) {
    for (float j = -4.0; j <= 4.0; j += 1.0) {
      float dist = length(vec2(i, j));
      if (dist > 4.0) continue;
      float weight = exp(-(dist * dist) / (2.0 * sigma * sigma));
      color += sampleSource(containerOffset + refrPx + vec2(i, j) * sigma) * weight;
      totalWeight += weight;
    }
  }
  color /= totalWeight;

  // ---- Teintes : dégradé vertical + dégradé échantillonné (thématisés)
  float gradientPosition = coord.y;
  vec3 gradientTint = mix(u_tintTop, u_tintBottom, gradientPosition);
  color = mix(color, gradientTint, u_tintOpacity * (u_nested > 0.5 ? 0.7 : 1.0));

  vec3 sampledGradient;
  if (gradientPosition < 0.1) {
    sampledGradient = u_topColor;
  } else if (gradientPosition > 0.9) {
    sampledGradient = u_bottomColor;
  } else {
    float tp = (gradientPosition - 0.1) / 0.8;
    sampledGradient = tp < 0.5 ? mix(u_topColor, u_midColor, tp * 2.0) : mix(u_midColor, u_bottomColor, (tp - 0.5) * 2.0);
  }
  color = mix(color, sampledGradient, u_tintOpacity * (u_nested > 0.5 ? 0.4 : 0.3));

  // Lisibilité du texte posé sur le verre
  color = mix(color, u_tintBottom, u_darken);

  // Liseré lumineux + halo de survol
  color += vec3(1.0) * pow(rimIntensity, 2.0) * 0.12;
  color += u_highlightColor * (rimIntensity * 0.9 + edgeIntensity * 0.25) * u_highlight;

  float mask = 1.0 - smoothstep(-1.0, 1.0, shapeDistance(coord));
  gl_FragColor = vec4(color * mask, mask);
}
`
