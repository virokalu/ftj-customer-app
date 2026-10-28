import { useState, type ComponentProps, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand, RouteArc } from "@/components/route-arc";
import { radius, spacing, useTheme } from "@/theme/theme";

// Fixed so the brand and route sit at the same pixels on both screens.
const TOP_BAR_HEIGHT = 40;

// Tallest text area laid out so far in this app run. Welcome (always shown first) sets it,
// and Sign in's shorter text area grows to match, so both panels end at the same line.
let tallestTextArea = 0;

/**
 * Dark hero panel shared by Welcome and Sign in. The two screens cross-fade, so the panel
 * must not move between them: the brand and route are placed from the top, the text follows
 * the route, and the text area is as tall on both screens. The panel fits its content, so it
 * never leaves empty grey space.
 */
export function AuthHero({
  routeAnimated,
  brandEntering,
  children,
}: {
  routeAnimated: boolean;
  brandEntering?: ComponentProps<typeof Animated.View>["entering"];
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Read once per mount: a screen that opens later matches the text area measured before it.
  const [textMinHeight] = useState(() => tallestTextArea || undefined);

  return (
    <View style={[styles.panel, { backgroundColor: t.hero, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <Animated.View entering={brandEntering}>
          <Brand />
        </Animated.View>
      </View>

      <View style={styles.route}>
        <RouteArc animated={routeAnimated} />
      </View>

      <View
        style={[styles.text, { minHeight: textMinHeight }]}
        onLayout={(e) => {
          tallestTextArea = Math.max(tallestTextArea, e.nativeEvent.layout.height);
        }}
      >
        {children}
      </View>
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
  route: { paddingTop: spacing.lg },
  text: { paddingTop: spacing.lg },
});
