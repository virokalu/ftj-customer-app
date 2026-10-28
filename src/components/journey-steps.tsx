import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Fragment, useEffect, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui";
import { spacing, useTheme } from "@/theme/theme";

// What the user follows once signed in, shown as pills in the Sign in hero.
const steps: { icon: SymbolViewProps["name"]; label: string }[] = [
  { icon: { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }, label: "Booked" },
  { icon: { ios: "ferry.fill", android: "directions_boat", web: "directions_boat" }, label: "On the ship" },
  { icon: { ios: "flag.fill", android: "flag", web: "flag" }, label: "Arrived" },
];
const LAST = steps.length - 1;

// Gap between one item popping up and the next, in path order: icon, arrow, icon, arrow, icon.
const POP_GAP = 250;
const ICON_SIZE = 14;
const ARROW_SIZE = 11;

/**
 * Booked > On the ship > Arrived pills joined by arrowheads, showing the path a vehicle takes.
 * On the first visit (`animated`) the icons and arrows pop up one at a time along the path:
 * Booked, arrow, On the ship, arrow, Arrived. Only the last (Arrived) flag is red.
 * Otherwise, and under Reduce Motion, everything shows at once.
 */
export function JourneySteps({
  animated,
  delay = 0,
  stagger = 80,
}: {
  animated: boolean;
  delay?: number;
  stagger?: number;
}) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const play = animated && !reduceMotion;
  // Icons pop once all pills have faded in.
  const popStart = delay + LAST * stagger + 400;

  return (
    <View style={styles.row}>
      {steps.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 ? (
            <PopIn at={play ? popStart + (2 * i - 1) * POP_GAP : undefined} style={styles.arrow}>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
                size={ARROW_SIZE}
                tintColor={t.onHeroMuted}
              />
            </PopIn>
          ) : null}
          <Animated.View
            entering={play ? FadeInUp.delay(delay + i * stagger).duration(400) : undefined}
            style={[styles.pill, { backgroundColor: t.heroChip }]}
          >
            <PopIn at={play ? popStart + 2 * i * POP_GAP : undefined} style={styles.icon}>
              <SymbolView name={s.icon} size={ICON_SIZE} tintColor={i === LAST ? t.accent : t.onHero} />
            </PopIn>
            <AppText numberOfLines={1} style={{ color: t.onHero, fontSize: 12, fontWeight: "600" }}>
              {s.label}
            </AppText>
          </Animated.View>
        </Fragment>
      ))}
    </View>
  );
}

// Pops its content up once (grows from nothing with one small overshoot) at `at` ms;
// shown at once without it.
function PopIn({ at, style, children }: { at?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const scale = useSharedValue(at === undefined ? 1 : 0);
  useEffect(() => {
    if (at === undefined) return;
    scale.value = withDelay(at, withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.6)) }));
  }, [at, scale]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Animated.View style={[style, popStyle]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  // One row: the three pills share the width equally, joined by arrowheads.
  row: { flexDirection: "row", alignItems: "center", marginTop: spacing.md + spacing.xs },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: 999,
  },
  icon: { width: ICON_SIZE, height: ICON_SIZE, alignItems: "center", justifyContent: "center" },
  arrow: { marginHorizontal: spacing.xs, alignItems: "center", justifyContent: "center" },
});
