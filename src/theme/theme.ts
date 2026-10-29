import { Appearance, useColorScheme } from "react-native";

// Design tokens. Screens use these names ("background", "accent"), never raw hex codes,
// so dark mode and later re-branding are a one-file change.
// Every text/background pair below meets WCAG AA (4.5:1) in its theme. Crimson is split in
// two: `accent` for fills (white text on it) and `accentText` for crimson-coloured text,
// because no single crimson passes both ways on a dark background.
const light = {
  background: "#FFFFFF",
  surface: "#F6F6F7",
  // Card lists (My vehicles): a tinted page with raised white cards, like iOS grouped lists.
  canvas: "#F2F2F5",
  card: "#FFFFFF",
  control: "#E6E6EB", // search fields and segmented controls sitting on `canvas`
  controlSelected: "#FFFFFF",
  border: "#E4E4E7",
  text: "#18181B",
  textMuted: "#6A6A73",
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
} as const;

const dark = {
  background: "#0F0F11",
  surface: "#1A1A1D",
  canvas: "#0B0B0D",
  card: "#1C1C21",
  control: "#1C1C21",
  controlSelected: "#3A3A41",
  border: "#2E2E33",
  text: "#F4F4F5",
  textMuted: "#A1A1AA",
  accent: "#C81E3A", // deeper crimson: white text on it is 5.7:1
  accentText: "#F05A70", // lighter crimson for links and labels: 5.8:1 on the background
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
