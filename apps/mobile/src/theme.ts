// Piste 2 « Nuit et néon » : six tailles, Barlow pour le texte, Barlow Semi Condensed pour titres et chiffres.
export const colors = {
  night: '#0E1220',
  slate: '#171C2E',
  slateHi: '#1F2640',
  line: '#2A3150',
  chalk: '#F2F4F8',
  soft: '#C4CAD8',
  mute: '#A3ACC0',
  neon: '#C6F432',
  neonSoft: 'rgba(198,244,50,0.14)',
  coral: '#FF6B3D',
  azure: '#5B8CFF',
} as const;

export const fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  display: 'BarlowSemiCondensed_600SemiBold',
  displayBold: 'BarlowSemiCondensed_700Bold',
} as const;

/** Échelle : 13 / 15 / 17 / 22 / 28 / 40. */
export const type = {
  number: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 44 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 32 },
  heading: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27 },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 },
  detail: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  button: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 23 },
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { button: 12, card: 16, hero: 24 } as const;
/** Marge latérale des écrans. */
export const gutter = 20;
