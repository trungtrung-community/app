/**
 * @fileoverview GENERATED FILE — DO NOT EDIT.
 *
 * Regenerate with:  npm run sync:design
 * Verify with:      npm run sync:design -- --check
 *
 * The design system as typed values, for the places a className cannot reach:
 * react-native-svg props, Reanimated values, imperative styles, and anything
 * measured in JavaScript. Prefer a Uniwind class wherever one exists.
 *
 * Lengths are resolved to points (rem at 16) and durations to milliseconds,
 * because React Native takes numbers where CSS takes units.
 *
 * fonts.css          sha256 09ee452abb3a1e93
 * colors.css         sha256 69aa7cd4057a5338
 * typography.css     sha256 40e31d0387891a99
 * spacing.css        sha256 370106530fa291ce
 * radius.css         sha256 bf7c9fc6407960c6
 * elevation.css      sha256 e78d34fe956f6cc0
 * motion.css         sha256 5b4555d58335a92d
 * base.css           sha256 a15b7ce5137c75fb
 */

/** Every palette and semantic colour, flattened to a literal. */
export const color = {
  ground000: "#FFFFFF",
  ground050: "#F7FAFB",
  ground100: "#EDF2F3", // brand ground
  ground200: "#DFE7E9",
  ground300: "#CBD6D9",
  ground400: "#AEBDC1",
  ink950: "#0A171D", // one step below brand ink — the solid edge under an ink control
  ink900: "#12222A", // brand ink
  ink800: "#1C3038",
  ink700: "#2B4249",
  ink500: "#4E666E",
  ink400: "#6B838B",
  ink300: "#8DA2A8",
  teal900: "#0C4548",
  teal800: "#12595E",
  teal700: "#196F74",
  teal600: "#1F8A90", // brand accent
  teal500: "#2CA5AB",
  teal300: "#7FCBCE",
  teal200: "#B4E1E3",
  teal100: "#DCF0F1",
  crown600: "#E23B34", // red crown patch — streaks, hearts, destructive
  crown500: "#E85A54", // the crown lightened — hover only, per the 6% rule
  crown800: "#B82E28", // the darker crown — the solid pressed edge under a red control
  crown100: "#FBE3E1",
  beak600: "#F5A623", // beak orange — XP, rewards, highlights
  beak100: "#FDEDD4",
  leg400: "#D2918F", // leg pink — decorative only
  grass600: "#2E8B57", // correct
  grass100: "#DDF0E5",
  flagBlue: "#2E6E8E", // sky — the one colour the palette lacked
  flagWhite: "#F7FAFB", // air
  flagRed: "#E23B34", // fire
  flagGreen: "#2E8B57", // water
  flagYellow: "#F5A623", // earth
  surfaceApp: "#EDF2F3",
  surfaceCard: "#FFFFFF",
  surfaceSunken: "#DFE7E9",
  surfaceRaised: "#F7FAFB",
  surfaceInk: "#12222A",
  surfaceAccent: "#1F8A90",
  surfaceAccentSoft: "#DCF0F1",
  surfaceReward: "#FDEDD4",
  surfaceAlert: "#FBE3E1",
  surfaceCorrect: "#DDF0E5",
  textHeading: "#12222A",
  textBody: "#1C3038",
  textMuted: "#6B838B",
  textSubtle: "#8DA2A8",
  textOnInk: "#EDF2F3",
  textOnAccent: "#FFFFFF",
  textAccent: "#196F74",
  textLink: "#196F74",
  textLinkHover: "#0C4548",
  textTibetan: "#12222A",
  railTrack: "#CBD6D9",
  railActive: "#1F8A90",
  railDone: "#7FCBCE",
  railLocked: "#CBD6D9",
  railNodeDone: "#2CA5AB", // done nodes: saturated, white content, check badge
  railNodeLocked: "#DFE7E9", // locked nodes: clearly grey, never teal
  dividerSoft: "#DFE7E9", // the Divider rule — never used as a card border
  focusRing: "#1F8A90",
  scrim: "rgba(18, 34, 42, 0.55)",
} as const;

/** The Latin and Tibetan size ramps, in points. */
export const fontSize = {
  "3xs": 11, // 11
  "2xs": 12, // 12
  xs: 13, // 13
  sm: 14, // 14
  md: 16, // 16
  lg: 18, // 18
  xl: 22, // 22
  "2xl": 28, // 28
  "3xl": 36, // 36
  "4xl": 48, // 48
  "5xl": 64, // 64
  tibXs: 14, // Tibetan inside a micro-label (--text-2xs / --text-3xs)
  tibSm: 17,
  tibMd: 22,
  tibLg: 30,
  tibXl: 44,
  tibHero: 68,
} as const;

/** Line-height multipliers. Multiply by the font size — React Native takes an absolute lineHeight, not a ratio. */
export const leading = {
  latin: 1.55,
  tibetan: 2.1,
  display: 1.06,
  tight: 1.2,
} as const;

/** Letter spacing, left in em. React Native measures letterSpacing in points, so an em value has to be resolved against the size of the role using it. */
export const tracking = {
  display: "-0.02em",
  body: "0em",
  caps: "0.08em",
  tibetan: "0em", // never letter-space Tibetan — it breaks stacks
} as const;

/** CSS weight numbers, for reference. React Native ignores fontWeight on a bundled family — use fontFamily instead. */
export const weight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  display: 800,
} as const;

/** The spacing scale, in points. */
export const space = {
  "0": 0,
  "1": 4,
  "1h": 6,
  "2": 8,
  "2h": 10,
  "3": 12,
  "3h": 14,
  "4": 16,
  "5": 20,
  "6": 24,
  "7": 28,
  "8": 32,
  "10": 40,
  "12": 48,
  "16": 64,
  "20": 80,
  "24": 96,
} as const;

/** Fixed layout constants: gutters, bar heights, rail geometry, measures. The two `ch` measures stay strings — a character width depends on the font and size of whatever is being constrained, so it can only be resolved at the call site. On a phone both measures are wider than the screen, so they rarely bind. */
export const layout = {
  gutterMobile: 20,
  gutterDesktop: 40,
  measureProse: "62ch",
  measureTibetan: "34ch", // Tibetan wraps badly — keep lines short
  touchMin: 48,
  tabbarHeight: 76,
  appbarHeight: 60,
  railNode: 68, // head-rail node diameter
  railGap: 44, // vertical distance between nodes
  railAmplitude: 84, // horizontal sway of the winding journey rail
} as const;

/** Corner radii, in points. --radius-pill is a large constant, not a percentage. */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  "2xl": 36,
  pill: 999,
  card: 20,
  sheet: 36,
  control: 14,
} as const;

/** Shadows, edges and rings. The box-shadow strings pass to React Native boxShadow on the new architecture; the bare lengths are points. */
export const elevation = {
  shadowNone: "none",
  shadowPress: "inset 0 2px 0 0 rgba(18, 34, 42, 0.08)",
  shadowLift: "0 1px 0 0 rgba(18, 34, 42, 0.06)",
  shadowFloat: "0 8px 24px -8px rgba(18, 34, 42, 0.22)",
  shadowSheet: "0 -12px 40px -12px rgba(18, 34, 42, 0.2)",
  shadowKeycap: "0 3px 0 0 #CBD6D9", // flat keycap edge on reference grid cells — solid offset, no blur
  edgeAccent: "0 4px 0 0 #12595E",
  edgeInk: "0 4px 0 0 #12222A",
  edgeGround: "0 4px 0 0 #CBD6D9",
  edgeCrown: "0 4px 0 0 #B82E28",
  edgeCorrect: "0 4px 0 0 #2E8B57",
  edgeGroundSm: "0 2px 0 0 #CBD6D9", // the shallow edge on segmented controls
  edgeDepth: 4,
  edgeDepthPressed: 2, // the pressed sibling: the edge shrinks, the control sinks onto it
  ringNode: "inset 0 0 0 2.5px #1F8A90",
  ringRowMet: "inset 0 0 0 2px #AEBDC1",
  ringRowComing: "inset 0 0 0 2px #CBD6D9",
  ringMarker: "inset 0 0 0 2.5px #AEBDC1", // the hollow marker on an unmet capability
  borderNone: 0,
  dividerHairline: 1, // the one sanctioned line: a half-width rule inside a single card
  outlineMascot: 3, // illustration stroke weight
} as const;

/** Durations in milliseconds, easing curves as CSS strings, and the press constants. */
export const motion = {
  easeOut: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  easeInOut: "cubic-bezier(0.6, 0, 0.4, 1)",
  easeSettle: "cubic-bezier(0.34, 1.4, 0.64, 1)", // one soft overshoot, no wobble
  durInstant: 80,
  durFast: 140,
  durBase: 220,
  durSlow: 360,
  durRail: 720, // rail path draw-on
  pressScale: 0.97,
  pressTranslate: 2, // primary buttons sink onto their edge
  hoverLighten: "6%",
} as const;

/**
 * Registered React Native family names, one per bundled (family, weight) face.
 *
 * Every name here is loaded by fonts.generated.ts — the two are emitted from
 * the same table, so a name cannot reference a face the app never registered.
 */
export const fontFamily = {
  displayBold: "Gabarito_700Bold",
  displayExtrabold: "Gabarito_800ExtraBold",
  bodyRegular: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemibold: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
  bodyMediumItalic: "PlusJakartaSans_500Medium_Italic",
  bodyBoldItalic: "PlusJakartaSans_700Bold_Italic",
  tibetanRegular: "NotoSerifTibetan_400Regular",
  tibetanMedium: "NotoSerifTibetan_500Medium",
  mono: "Menlo",
} as const;
