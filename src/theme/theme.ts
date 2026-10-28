import { useColorScheme } from "react-native";

// Design tokens. Screens use these names ("background", "accent"), never raw hex codes,
// so dark mode and later re-branding are a one-file change.
// TODO: replace with the exact crimson and neutrals from the design sheets.
const light = {
  background: "#FFFFFF",
  surface: "#F6F6F7",
  border: "#E4E4E7",
  text: "#18181B",
  textMuted: "#71717A",
  accent: "#B3122B", // crimson
  accentSoft: "#FBE7EA", // tinted backdrop behind accent icons
  onAccent: "#FFFFFF",
  danger: "#B91C1C",
  hero: "#2B2B2D", // dark panel at the top of the welcome screen
  onHero: "#FFFFFF",
  onHeroMuted: "#C9C9CE",
  heroChip: "rgba(255,255,255,0.08)", // small pills on the hero panel
} as const;

const dark = {
  background: "#0F0F11",
  surface: "#1A1A1D",
  border: "#2E2E33",
  text: "#F4F4F5",
  textMuted: "#A1A1AA",
  accent: "#E0364F",
  accentSoft: "#3A1A20",
  onAccent: "#FFFFFF",
  danger: "#F87171",
  hero: "#1F1F23",
  onHero: "#FFFFFF",
  onHeroMuted: "#A1A1AA",
  heroChip: "rgba(255,255,255,0.08)",
} as const;

export type Theme = { [K in keyof typeof light]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { md: 12, lg: 16 } as const;

// "Auto" follows the phone; an Appearance setting (Auto/Light/Dark) can override this later.
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
