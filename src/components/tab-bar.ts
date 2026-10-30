import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/theme/theme";

// The floating tab bar (src/app/(tabs)/_layout.tsx): a rounded card that hovers above the home
// indicator instead of spanning the bottom edge. Screens under it scroll their last item clear
// of it with `useTabBarSpace()`.

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_RADIUS = 24;

/** Distance from the bottom edge to the bar: just above the home indicator, or 12 pt without one. */
export function useTabBarBottom(): number {
  const insets = useSafeAreaInsets();
  return Math.max(12, insets.bottom - 10);
}

/** Bottom padding for a tab screen's scroll content, so nothing ends up hidden behind the bar. */
export function useTabBarSpace(): number {
  return TAB_BAR_HEIGHT + useTabBarBottom() + spacing.md;
}
