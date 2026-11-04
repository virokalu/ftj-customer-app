import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type AccessibilityRole } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { GlassLayer, liquidGlass } from "@/components/glass";
import { radius, useTheme } from "@/theme/theme";

const PAD = 3;

/**
 * The track of a tab switch (On the way / Purchase history, Overview / Timeline / Photos): a glass
 * track with a glass highlight that slides to the selected tab. Smooth timed slide, no bounce;
 * instant under Reduce Motion. Without Liquid Glass: the solid control track and selected pill.
 * The tabs themselves (`children`) are equal-width buttons with no fill of their own.
 */
export function SegmentTrack({
  count,
  index,
  accessibilityRole,
  children,
}: {
  count: number;
  index: number;
  accessibilityRole?: AccessibilityRole;
  children: ReactNode;
}) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const segment = width > 0 ? (width - PAD * 2) / count : 0;

  const position = useSharedValue(index);
  useEffect(() => {
    position.set(reduceMotion ? index : withTiming(index, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [index, reduceMotion, position]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * segment }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: liquidGlass ? "transparent" : t.control }]}
      accessibilityRole={accessibilityRole}
    >
      {liquidGlass ? <GlassLayer radius={radius.md} /> : null}
      {segment > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.highlight, { width: segment }, slide]}>
          <GlassLayer
            radius={radius.md - PAD}
            // A lighter tint than the track, so the selected tab stands out on the glass.
            tint={`${t.controlSelected}99`}
            fallback={
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.solid,
                  { backgroundColor: t.controlSelected, borderColor: t.border },
                ]}
              />
            }
          />
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: radius.md, padding: PAD },
  highlight: { position: "absolute", top: PAD, bottom: PAD, left: PAD },
  solid: { borderRadius: radius.md - PAD, borderWidth: StyleSheet.hairlineWidth },
});
