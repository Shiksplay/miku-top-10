/**
 * Données du classement.
 *
 * Hypothèses documentées :
 * - Liens d'écoute : Spotify et niconico pointent vers des pages de RECHERCHE, pour ne jamais
 *   publier de lien inventé, mort ou non officiel. YouTube aussi, sauf quand la vidéo officielle
 *   a été vérifiée (voir `video` ci-dessous) : le lien YouTube pointe alors vers cette vidéo exacte.
 * - Vidéos officielles (vérifiées le 2026-09-19) : pour 8 morceaux sur 10, l'ID YouTube a été
 *   contrôlé via l'oEmbed public de YouTube (titre exact + chaîne éditrice). Seules sont retenues
 *   la chaîne du producteur ou la chaîne officielle Hatsune Miku de Crypton Future Media.
 * - Miniatures : pour ces 8 morceaux, la carte révèle au survol la miniature publique de la vidéo
 *   (i.ytimg.com), par un fondu « liquide » depuis la scène générative, qui reste le visuel par
 *   défaut. L'image est chargée directement depuis YouTube, jamais copiée ni ré-hébergée (pas de
 *   proxy next/image) : elle reste liée à sa source officielle. C'est une extension assumée de la
 *   politique initiale « aucun visuel officiel » (voir THIRD_PARTY_NOTICES.md).
 * - Points ouverts : « Melt » et « Ievan Polkka » n'ont pas de mise en ligne officielle identifiée
 *   (ni chez le producteur, ni sur la chaîne officielle). Ils gardent le visuel génératif et des
 *   liens de recherche, sans rien forcer.
 * - Précisions : pour « World is Mine », la vidéo officielle est une captation live (chaîne
 *   Crypton), pas le clip niconico d'origine. Pour « The Disappearance of Hatsune Miku », c'est le
 *   MV officiel du 10e anniversaire (2018), publié par cosMo@暴走P.
 * - `tempo` est une valeur ARTISTIQUE qui cadence les animations. Ce n'est pas une
 *   donnée factuelle et elle n'est jamais affichée.
 * - « Mesmerizer » : le brief indiquait « Sat/3ano ». Le titre est de サツキ (Satsuki), 2024, en
 *   duo avec Kasane Teto : confirmé par la mise en ligne officielle (chaîne サツキ, « メズマライザー /
 *   初音ミク・重音テトSV »).
 */

export type Genre = 'pop' | 'rock' | 'electro' | 'folk' | 'chiptune'
export type Era = 'pionniers' | 'age-d-or' | 'ere-globale'

export type SceneKind =
  | 'crystal' // World is Mine
  | 'melt' // Melt
  | 'petals' // Senbonzakura
  | 'rolling' // Rolling Girl
  | 'baton' // Ievan Polkka
  | 'dissolve' // Disappearance
  | 'network' // Tell Your World
  | 'ghost' // Ghost Rule
  | 'spiral' // Mesmerizer
  | 'voxels' // Miku

/** Signature chromatique passée au ShaderGradient (props réelles de la lib). */
export type GradientSignature = {
  type: 'plane' | 'sphere' | 'waterPlane'
  color1: string
  color2: string
  color3: string
  uSpeed: number
  uStrength: number
  uFrequency: number
  uDensity: number
  cDistance: number
  cPolarAngle: number
  cAzimuthAngle: number
}

export type ListenLink = {
  platform: 'YouTube' | 'Spotify' | 'niconico'
  href: string
  /** `video` : URL exacte de la vidéo officielle vérifiée. `search` : page de recherche. */
  kind: 'video' | 'search'
}

/** Mise en ligne officielle vérifiée (oEmbed YouTube : titre et chaîne contrôlés). */
export type OfficialVideo = {
  id: string
  /** Chaîne qui publie la vidéo. */
  channel: string
  /** Plus grande miniature publiée pour cette vidéo. */
  thumb: 'maxresdefault' | 'hqdefault'
  /** Miniature 4:3 avec bandes noires incrustées : la zone utile 16:9 est recadrée. */
  letterbox?: boolean
}

export type Song = {
  rank: number
  slug: string
  title: string
  titleJa?: string
  producer: string
  year: number
  genre: Genre
  era: Era
  /** Une phrase pour la carte du classement. */
  hook: string
  /** Paragraphes de la vue détail. */
  story: string[]
  /** Nuance d'accent propre au morceau (teal / cyan / magenta). */
  accent: string
  gradient: GradientSignature
  scene: SceneKind
  tempo: number
  /** Texte alternatif du visuel génératif. */
  artAlt: string
  listen: ListenLink[]
  /** Absente quand aucune mise en ligne officielle n'a pu être vérifiée (voir en tête). */
  video?: OfficialVideo
}

const listenLinks = (q: string, video?: OfficialVideo): ListenLink[] => {
  const e = encodeURIComponent(q)
  return [
    video
      ? { platform: 'YouTube', kind: 'video', href: `https://www.youtube.com/watch?v=${video.id}` }
      : { platform: 'YouTube', kind: 'search', href: `https://www.youtube.com/results?search_query=${e}` },
    { platform: 'Spotify', kind: 'search', href: `https://open.spotify.com/search/${e}` },
    { platform: 'niconico', kind: 'search', href: `https://www.nicovideo.jp/search/${e}` },
  ]
}

/** Miniature publique de la vidéo, servie par YouTube (jamais ré-hébergée). */
export const coverUrl = (video: OfficialVideo) => `https://i.ytimg.com/vi/${video.id}/${video.thumb}.jpg`

const CRYPTON = 'Hatsune Miku (chaîne officielle, Crypton Future Media)'

/** Vidéos vérifiées le 2026-09-19 (oEmbed : titre exact + chaîne). */
const videos = {
  worldIsMine: { id: 'jhl5afLEKdo', channel: CRYPTON, thumb: 'maxresdefault' },
  senbonzakura: { id: 'shs0rAiwsGQ', channel: 'WhiteFlame official (Kurousa-P)', thumb: 'maxresdefault' },
  rollingGirl: { id: 'vnw8zURAxkU', channel: 'ヒトリエ / wowaka', thumb: 'hqdefault', letterbox: true },
  disappearance: { id: 'VWVtIg5cdDU', channel: 'cosMo@暴走P', thumb: 'maxresdefault' },
  tellYourWorld: { id: 'PqJNc9KVIZE', channel: 'kz-livetune', thumb: 'maxresdefault' },
  ghostRule: { id: 'KushW6zvazM', channel: 'DECO*27', thumb: 'maxresdefault' },
  mesmerizer: { id: '19y8YTbvri8', channel: 'サツキ', thumb: 'maxresdefault' },
  miku: { id: 'NocXEwsJGOQ', channel: CRYPTON, thumb: 'maxresdefault' },
} satisfies Record<string, OfficialVideo>

const base = { uDensity: 1.3, cAzimuthAngle: 180 } as const

/** Ordonné du n°1 au n°10. L'interface affiche le compte à rebours de 10 à 1. */
export const songs: Song[] = [
  {
    rank: 1,
    slug: 'world-is-mine',
    title: 'World is Mine',
    titleJa: 'ワールドイズマイン',
    producer: 'ryo (supercell)',
    year: 2008,
    genre: 'pop',
    era: 'pionniers',
    hook: 'L’hymne « princesse » qui a fait de Miku une star mondiale.',
    story: [
      'Miku y joue une diva capricieuse qui exige d’être traitée en princesse. Ce personnage a fixé pour longtemps l’image publique de la chanteuse virtuelle.',
      'Porté par la production pop-rock très dense de ryo, le morceau est devenu un classique des concerts. C’est souvent par lui que le public étranger a découvert Miku.',
    ],
    accent: '#F0468F',
    gradient: {
      ...base,
      type: 'sphere',
      color1: '#F0468F',
      color2: '#39C5BB',
      color3: '#1A0B14',
      uSpeed: 0.28,
      uStrength: 1.2,
      uFrequency: 5.2,
      cDistance: 3.4,
      cPolarAngle: 90,
    },
    scene: 'crystal',
    tempo: 1.35,
    artAlt:
      'Cristal abstrait à facettes roses et turquoise, en lente rotation au centre d’une couronne d’éclats.',
    video: videos.worldIsMine,
    listen: listenLinks('World is Mine ryo supercell 初音ミク', videos.worldIsMine),
  },
  {
    rank: 2,
    slug: 'melt',
    title: 'Melt',
    titleJa: 'メルト',
    producer: 'ryo (supercell)',
    year: 2007,
    genre: 'pop',
    era: 'pionniers',
    hook: 'La chanson d’amour qui a révélé la palette émotionnelle du Vocaloid.',
    story: [
      'Publiée quelques mois après la sortie du logiciel, Melt montre qu’une voix de synthèse peut porter une vraie ballade amoureuse, loin des démos techniques.',
      'Le titre a déclenché une vague de reprises chantées par des humains. Il a aussi installé ryo parmi les producteurs majeurs de la scène, avant la création de supercell.',
    ],
    accent: '#FF7AB0',
    gradient: {
      ...base,
      type: 'waterPlane',
      color1: '#FF7AB0',
      color2: '#39C5BB',
      color3: '#200E18',
      uSpeed: 0.18,
      uStrength: 2.4,
      uFrequency: 3.6,
      cDistance: 4.2,
      cPolarAngle: 80,
    },
    scene: 'melt',
    tempo: 0.9,
    artAlt: 'Sphère liquide rose qui fond lentement vers le bas, ses gouttes s’étirant sur un fond turquoise sombre.',
    listen: listenLinks('Melt ryo supercell メルト 初音ミク'),
  },
  {
    rank: 3,
    slug: 'senbonzakura',
    title: 'Senbonzakura',
    titleJa: '千本桜',
    producer: 'Kurousa-P',
    year: 2011,
    genre: 'rock',
    era: 'age-d-or',
    hook: 'Tradition et rock à haute énergie : un tube mondial qui ne faiblit pas.',
    story: [
      'Kurousa-P mêle gammes et imagerie de l’ère Taishō à un rock survolté. Le résultat est l’un des morceaux Vocaloid les plus repris de tous les temps, par des chanteurs, des orchestres et des joueurs de shamisen.',
      'Sa popularité a largement dépassé la scène Vocaloid : le titre a même été interprété au Kōhaku Uta Gassen, l’émission musicale du Nouvel An au Japon.',
    ],
    accent: '#F28FB5',
    gradient: {
      ...base,
      type: 'plane',
      color1: '#F28FB5',
      color2: '#8A1C3F',
      color3: '#39C5BB',
      uSpeed: 0.34,
      uStrength: 3.2,
      uFrequency: 5.5,
      cDistance: 3.6,
      cPolarAngle: 90,
    },
    scene: 'petals',
    tempo: 1.55,
    artAlt: 'Tourbillon de centaines de pétales abstraits rose pâle qui s’enroulent autour d’un axe invisible.',
    video: videos.senbonzakura,
    listen: listenLinks('千本桜 黒うさP 初音ミク Senbonzakura', videos.senbonzakura),
  },
  {
    rank: 4,
    slug: 'rolling-girl',
    title: 'Rolling Girl',
    titleJa: 'ローリンガール',
    producer: 'wowaka',
    year: 2010,
    genre: 'rock',
    era: 'age-d-or',
    hook: 'Rapide, dense, bouleversant : le morceau qui a défini tout un style.',
    story: [
      'Guitares nerveuses, débit de paroles effréné, mélodie qui ne reprend jamais son souffle : Rolling Girl pose les bases du son wowaka, imité par toute une génération de producteurs.',
      'Derrière l’énergie, le texte évoque l’épuisement et l’envie de tenir malgré tout. C’est ce contraste qui en a fait un morceau culte. wowaka, disparu en 2019, reste l’une des figures les plus influentes de la scène.',
    ],
    accent: '#5AD1FF',
    gradient: {
      ...base,
      type: 'plane',
      color1: '#5AD1FF',
      color2: '#1B2B6B',
      color3: '#F0468F',
      uSpeed: 0.5,
      uStrength: 2.2,
      uFrequency: 6.5,
      cDistance: 3.2,
      cPolarAngle: 100,
    },
    scene: 'rolling',
    tempo: 1.9,
    artAlt: 'Anneaux cyan qui roulent à toute vitesse en laissant des traînées lumineuses.',
    video: videos.rollingGirl,
    listen: listenLinks('ローリンガール wowaka 初音ミク Rolling Girl', videos.rollingGirl),
  },
  {
    rank: 5,
    slug: 'ievan-polkka',
    title: 'Ievan Polkka',
    producer: 'Otomania',
    year: 2007,
    genre: 'folk',
    era: 'pionniers',
    hook: 'Le cover viral qui a donné à Miku son célèbre poireau.',
    story: [
      'Reprise d’une chanson traditionnelle finlandaise, popularisée en ligne par une animation où un personnage fait tournoyer un poireau. La version d’Otomania pour Miku reprend le motif.',
      'Le poireau (negi) est devenu l’accessoire fétiche de la chanteuse virtuelle. C’est l’exemple parfait d’une culture façonnée par les fans plutôt que par un studio.',
    ],
    accent: '#7FE3A1',
    gradient: {
      ...base,
      type: 'waterPlane',
      color1: '#7FE3A1',
      color2: '#39C5BB',
      color3: '#0B2A22',
      uSpeed: 0.42,
      uStrength: 1.8,
      uFrequency: 4.4,
      cDistance: 4.4,
      cPolarAngle: 70,
    },
    scene: 'baton',
    tempo: 1.6,
    artAlt: 'Bâton cylindrique vert et blanc qui tournoie, entouré de pois lumineux qui rebondissent en rythme.',
    listen: listenLinks('Ievan Polkka 初音ミク Otomania'),
  },
  {
    rank: 6,
    slug: 'disappearance',
    title: 'The Disappearance of Hatsune Miku',
    titleJa: '初音ミクの消失',
    producer: 'cosMo@暴走P',
    year: 2008,
    genre: 'electro',
    era: 'pionniers',
    hook: 'Un défi de diction ultra-rapide, devenu titre culte.',
    story: [
      'Tempo vertigineux, paroles débitées plus vite qu’aucun humain ne pourrait les chanter : cosMo exploite ce que seule une voix de synthèse sait faire.',
      'Le texte imagine la fin d’un programme qui se sait oublié. Pour beaucoup de fans, c’est la chanson qui a fait de Miku un personnage tragique, et pas seulement un instrument.',
    ],
    accent: '#00E5FF',
    gradient: {
      ...base,
      type: 'plane',
      color1: '#00E5FF',
      color2: '#0A1A40',
      color3: '#39C5BB',
      uSpeed: 0.6,
      uStrength: 4,
      uFrequency: 7,
      cDistance: 3,
      cPolarAngle: 110,
    },
    scene: 'dissolve',
    tempo: 2.4,
    artAlt: 'Sphère de particules cyan qui se désagrège en poussière numérique.',
    video: videos.disappearance,
    listen: listenLinks('初音ミクの消失 cosMo 暴走P', videos.disappearance),
  },
  {
    rank: 7,
    slug: 'tell-your-world',
    title: 'Tell Your World',
    producer: 'livetune (kz)',
    year: 2012,
    genre: 'electro',
    era: 'age-d-or',
    hook: 'L’hymne électronique lumineux choisi par Google Chrome.',
    story: [
      'kz (livetune) signe un morceau électro-pop solaire autour de la création partagée : chacun peut faire chanter Miku et diffuser son œuvre.',
      'Choisi pour une publicité Google Chrome en 2012, il a porté ce message au-delà des fans et symbolise la dimension collaborative du phénomène.',
    ],
    accent: '#9FF3EC',
    gradient: {
      ...base,
      type: 'sphere',
      color1: '#9FF3EC',
      color2: '#39C5BB',
      color3: '#0E3B38',
      uSpeed: 0.3,
      uStrength: 0.9,
      uFrequency: 4,
      cDistance: 3.8,
      cPolarAngle: 90,
    },
    scene: 'network',
    tempo: 1.2,
    artAlt: 'Réseau de points lumineux reliés par des arcs, formant un globe qui s’illumine de proche en proche.',
    video: videos.tellYourWorld,
    listen: listenLinks('Tell Your World livetune 初音ミク', videos.tellYourWorld),
  },
  {
    rank: 8,
    slug: 'ghost-rule',
    title: 'Ghost Rule',
    titleJa: 'ゴーストルール',
    producer: 'DECO*27',
    year: 2016,
    genre: 'rock',
    era: 'ere-globale',
    hook: 'Un classique moderne fulgurant, signé par l’un des producteurs les plus prolifiques.',
    story: [
      'Riff tranchant, refrain qui explose : Ghost Rule condense l’influence rock de DECO*27, dont les titres figurent parmi les plus écoutés de la scène.',
      'Le morceau parle de mensonges qui finissent par hanter celui qui les raconte. Il est devenu incontournable en karaoké comme en concert.',
    ],
    accent: '#FF2E63',
    gradient: {
      ...base,
      type: 'plane',
      color1: '#FF2E63',
      color2: '#1A0710',
      color3: '#39C5BB',
      uSpeed: 0.46,
      uStrength: 3.6,
      uFrequency: 6,
      cDistance: 3.4,
      cPolarAngle: 95,
    },
    scene: 'ghost',
    tempo: 1.75,
    artAlt: 'Silhouettes translucides rouge et turquoise qui ondulent et se dédoublent comme un signal parasité.',
    video: videos.ghostRule,
    listen: listenLinks('ゴーストルール DECO*27 初音ミク Ghost Rule', videos.ghostRule),
  },
  {
    rank: 9,
    slug: 'mesmerizer',
    title: 'Mesmerizer',
    titleJa: 'メズマライザー',
    producer: 'サツキ (Satsuki)',
    year: 2024,
    genre: 'electro',
    era: 'ere-globale',
    hook: 'Tube viral et hypnotique, dont le clip a été décortiqué image par image.',
    story: [
      'En duo avec Kasane Teto, Mesmerizer combine une boucle obsédante et une esthétique de clip saturée de détails. Les fans y ont traqué indices et doubles sens.',
      'Son succès montre que la scène Vocaloid continue de produire des tubes mondiaux, près de vingt ans après la sortie du logiciel.',
    ],
    accent: '#B26BFF',
    gradient: {
      ...base,
      type: 'sphere',
      color1: '#B26BFF',
      color2: '#39C5BB',
      color3: '#20103A',
      uSpeed: 0.4,
      uStrength: 1.6,
      uFrequency: 5.8,
      cDistance: 3.2,
      cPolarAngle: 90,
    },
    scene: 'spiral',
    tempo: 1.45,
    artAlt: 'Spirale hypnotique violette et turquoise qui tourne sur elle-même, anneaux concentriques pulsants.',
    video: videos.mesmerizer,
    listen: listenLinks('メズマライザー サツキ 初音ミク 重音テト Mesmerizer', videos.mesmerizer),
  },
  {
    rank: 10,
    slug: 'miku-anamanaguchi',
    title: 'Miku',
    producer: 'Anamanaguchi',
    year: 2016,
    genre: 'chiptune',
    era: 'ere-globale',
    hook: 'Une collaboration chiptune joyeuse qui célèbre Miku à l’international.',
    story: [
      'Le groupe new-yorkais Anamanaguchi, connu pour ses sons de consoles 8-bit, fait chanter Miku en anglais sur une pop euphorique.',
      'C’est une déclaration d’amour d’artistes occidentaux au personnage. Elle montre à quel point Miku est devenue une icône pop partagée bien au-delà du Japon.',
    ],
    accent: '#7CF7E4',
    gradient: {
      ...base,
      type: 'waterPlane',
      color1: '#7CF7E4',
      color2: '#FF7AC6',
      color3: '#10333A',
      uSpeed: 0.36,
      uStrength: 2,
      uFrequency: 5,
      cDistance: 4,
      cPolarAngle: 75,
    },
    scene: 'voxels',
    tempo: 1.5,
    artAlt: 'Grille de petits cubes turquoise et roses qui sautent en rythme comme un égaliseur 8-bit.',
    video: videos.miku,
    listen: listenLinks('Anamanaguchi Miku Hatsune Miku', videos.miku),
  },
]

/** Ordre d'affichage : compte à rebours du n°10 au n°1. */
export const countdown: Song[] = [...songs].sort((a, b) => b.rank - a.rank)

export const songBySlug = (slug: string): Song | undefined => songs.find((s) => s.slug === slug)

/** Signature du fond sur le hero (hors morceau actif). */
export const heroGradient: GradientSignature = {
  type: 'plane',
  color1: '#39C5BB',
  color2: '#0E3B38',
  color3: '#0B0F0E',
  uSpeed: 0.22,
  uStrength: 2.6,
  uFrequency: 5.2,
  uDensity: 1.2,
  cDistance: 3.6,
  cPolarAngle: 90,
  cAzimuthAngle: 180,
}

export const eraLabel: Record<Era, string> = {
  pionniers: 'Les pionniers, 2007–2008',
  'age-d-or': 'L’âge d’or niconico, 2010–2012',
  'ere-globale': 'L’ère globale, 2016–2024',
}

export const genreLabel: Record<Genre, string> = {
  pop: 'Pop',
  rock: 'Rock',
  electro: 'Électro',
  folk: 'Folk',
  chiptune: 'Chiptune',
}
