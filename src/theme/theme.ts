import { Appearance, useColorScheme } from "react-native";

// Design tokens. Screens use these names ("background", "accent"), never raw hex codes,
// so dark mode and later re-branding are a one-file change.
// Every text/background pair below meets WCAG AA (4.5:1) in its theme. Crimson is split in
// two: `accent` for fills (white text on it) and `accentText` for crimson-coloured text,
// because no single crimson passes both ways on a dark background.
// Light mode is softened, not pure white: off-white cards on a light grey page, so large areas
// don't glare. Muted text is a shade darker to stay 4.5:1 on the deeper page.
const light = {
  background: "#EFEFF3",
  surface: "#E9E9ED",
  // Card lists (My vehicles): a tinted page with raised off-white cards, like iOS grouped lists.
  canvas: "#E6E6EB",
  card: "#F3F3F6",
  control: "#DCDCE2", // search fields and segmented controls sitting on `canvas`
  controlSelected: "#F3F3F6",
  controlOnCard: "#E3E3E8", // segmented control track inside a card (Appearance)
  // Neutral tile behind every icon (alerts, settings rows, shortcuts); the icon carries the colour.
  iconTile: "#E9E9EE",
  border: "#D9D9DF",
  text: "#18181B",
  textMuted: "#5E5E67",
  accent: "#B3122B", // crimson
  accentText: "#B3122B",
  accentSoft: "#FBE7EA", // tinted backdrop behind accent icons
  onAccent: "#FFFFFF",
  danger: "#B91C1C",
  onDanger: "#FFFFFF",
  hero: "#2B2B2D", // dark panel at the top of the welcome screen
  onHero: "#FFFFFF",
  onHeroMuted: "#C9C9CE",
  heroChip: "rgba(255,255,255,0.08)", // small pills on the hero panel
  // Status chips: a text colour plus a soft backdrop for each shipping stage.
  info: "#1D4ED8",
  infoSoft: "#E6EDFD",
  success: "#13733A",
  successSoft: "#E3F4E8",
  warning: "#A04A07",
  warningSoft: "#FCF0DC",
  violet: "#6D28D9",
  violetSoft: "#EFE8FC",
  // Vehicle status chips ("Charcoal with crimson highlight"): quiet greys before departure,
  // solid crimson at sea, solid charcoal on arrival, green once delivered. Text/background pairs,
  // all 4.5:1 or better.
  statusPending: "#52525B",
  statusPendingBg: "#EFEFF1",
  statusBooked: "#3F4A5A",
  statusBookedBg: "#E5E9EF",
  statusShipped: "#FFFFFF",
  statusShippedBg: "#B3122B",
  statusArrived: "#FFFFFF",
  statusArrivedBg: "#2B2B2D",
  statusDelivered: "#166534",
  statusDeliveredBg: "#E3F2E8",
  // Shipped and Arrived on Liquid Glass: their solid colours are button-like (white on crimson,
  // white on charcoal), so on see-through glass the text takes the status colour instead.
  statusShippedGlass: "#A3102A",
  statusShippedGlassBg: "rgba(179,18,43,0.16)",
  statusArrivedGlass: "#2B2B2D",
  statusArrivedGlassBg: "rgba(43,43,45,0.14)",
  // The little car in the sign-in loader.
  tyre: "#2A2A30",
  hub: "#C9C9CE",
  glass: "#DCE7F5",
} as const;

const dark = {
  background: "#0F0F11",
  surface: "#1A1A1D",
  canvas: "#0B0B0D",
  card: "#1C1C21",
  control: "#1C1C21",
  controlSelected: "#3A3A41",
  controlOnCard: "#0B0B0D", // darker than the card, so the selected #3A3A41 pill stands out
  iconTile: "#2A2A30",
  border: "#2E2E33",
  text: "#F4F4F5",
  textMuted: "#A1A1AA",
  accent: "#C81E3A", // deeper crimson: white text on it is 5.7:1
  accentText: "#C81E3A", // the main crimson, same as the tab bar and buttons (3.5:1 on the background)
  accentSoft: "#3A1A20",
  onAccent: "#FFFFFF",
  danger: "#F87171",
  onDanger: "#1F0A0A", // a light red fill needs a dark label in dark mode
  hero: "#1F1F23",
  onHero: "#FFFFFF",
  onHeroMuted: "#A1A1AA",
  heroChip: "rgba(255,255,255,0.08)",
  info: "#7DA2F7",
  infoSoft: "#1A2440",
  success: "#5CC488",
  successSoft: "#14291C",
  warning: "#F0B25A",
  warningSoft: "#33240F",
  violet: "#B197F5",
  violetSoft: "#261C3D",
  statusPending: "#C4C4CC",
  statusPendingBg: "#26262B",
  statusBooked: "#AFBBCB",
  statusBookedBg: "#1F242C",
  statusShipped: "#FFFFFF",
  statusShippedBg: "#C81E3A",
  statusArrived: "#18181B",
  statusArrivedBg: "#E4E4E7",
  statusDelivered: "#7BD39A",
  statusDeliveredBg: "#14291C",
  statusShippedGlass: "#FFB3BF", // light crimson: 7:1 on the crimson glass over a card
  statusShippedGlassBg: "rgba(200,30,58,0.4)",
  statusArrivedGlass: "#F4F4F5",
  statusArrivedGlassBg: "rgba(228,228,231,0.22)",
  tyre: "#050506",
  hub: "#8A8A93",
  glass: "#2C3A52",
} as const;

export type Theme = { [K in keyof typeof light]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { md: 12, lg: 16 } as const;

// Follows the phone, unless the Appearance setting overrides it (see applyAppearance).
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

/** The Appearance setting: "system" follows the phone (the API's `theme: null` too). */
export type AppearancePreference = "system" | "light" | "dark";

/**
 * Overrides light/dark for the whole app at the native level, so system UI inside the app
 * (alerts, sheets, the keyboard, the document viewer) follows the choice as well.
 */
export function applyAppearance(preference: AppearancePreference): void {
  Appearance.setColorScheme(preference === "system" ? "auto" : preference);
}
