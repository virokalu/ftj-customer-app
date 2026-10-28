import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand, RouteArc } from "@/components/route-arc";
import { radius, spacing, useTheme } from "@/theme/theme";

// Fixed so the brand and route sit at the same pixels on both screens.
const TOP_BAR_HEIGHT = 40;

// Share of the screen height the panel takes at least (content can make it taller on small phones).
const HERO_HEIGHT_RATIO = 0.55;

/** Welcome's hero copy. Sign in reserves the same height with it (see `matchWelcomeHeight`). */
export const welcomeCopy = {
  headline: "Your car, from auction to your door.",
  subhead: "Follow every step of your vehicle’s journey, with photos and documents as soon as they’re ready.",
};

/** Text styles for the hero's headline and subhead, shared so both screens' text measures alike. */
export const heroText = StyleSheet.create({
  headline: { fontSize: 30, fontWeight: "800", lineHeight: 36, letterSpacing: -0.5 },
  subhead: { fontSize: 15, lineHeight: 21, marginTop: spacing.sm },
});

/**
 * Dark hero panel shared by Welcome and Sign in. The two screens cross-fade, so the panel
 * must not move between them: both panels are at least HERO_HEIGHT_RATIO of the screen, the
 * route is centred in the space between the brand and the text, and the text sits at the bottom.
 *
 * `matchWelcomeHeight` (Sign in) makes the text area at least as tall as Welcome's, by laying
 * an invisible copy of Welcome's text under the real one. Both panels then end at the same
 * line whichever screen opens first (e.g. after a reload).
 */
export function AuthHero({
  routeAnimated,
  brandEntering,
  matchWelcomeHeight = false,
  children,
}: {
  routeAnimated: boolean;
  brandEntering?: ComponentProps<typeof Animated.View>["entering"];
  matchWelcomeHeight?: boolean;
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: t.hero, paddingTop: insets.top + spacing.sm, minHeight: height * HERO_HEIGHT_RATIO },
      ]}
    >
      <View style={styles.topBar}>
        <Animated.View entering={brandEntering}>
          <Brand />
        </Animated.View>
      </View>

      <View style={styles.route}>
        <RouteArc animated={routeAnimated} />
      </View>

      {matchWelcomeHeight ? (
        // Two full-width layers side by side, the second pulled back over the first:
        // the row is as tall as the taller of the two.
        <View style={[styles.text, styles.stack]}>
          <View
            style={styles.layer}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={[heroText.headline, styles.invisible]}>{welcomeCopy.headline}</Text>
            <Text style={[heroText.subhead, styles.invisible]}>{welcomeCopy.subhead}</Text>
          </View>
          <View style={[styles.layer, styles.overlay]}>{children}</View>
        </View>
      ) : (
        <View style={styles.text}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Panel and screen body share one left edge (spacing.lg) so brand, headline and content line up.
  panel: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg * 1.5,
    borderBottomRightRadius: radius.lg * 1.5,
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  // Takes the panel's spare height and centres the route in it. The text areas are equally tall
  // on both screens (matchWelcomeHeight), so the route lands at the same spot on each.
  route: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.lg },
  text: {},
  stack: { flexDirection: "row" },
  layer: { width: "100%" },
  overlay: { marginLeft: "-100%" },
  invisible: { opacity: 0 },
});
