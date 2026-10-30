import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";

import { useTheme } from "@/theme/theme";

// Sign in's loader (preview "Road moves under the car"): a small FTJ car stays in the middle of
// the lane, gently bouncing with its wheels turning, while the dashed road and speed lines rush
// past. Decorative: the text beside it says what is happening. Still under Reduce Motion.

const LANE_WIDTH = 210;
const LANE_HEIGHT = 30;
const CAR_W = 46;
const CAR_H = 23;
const DASH = 10; // dash and gap length; the road loops every 2 * DASH
const TYRE = 8.4;

/** A value that runs 0 -> 1 again and again (from `delay` ms), unless Reduce Motion is on. */
function useLoop(duration: number, delay = 0, easing = Easing.linear): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const value = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    value.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing }), -1)));
  }, [reduceMotion, value, duration, delay, easing]);
  return value;
}

export function RoadLoader() {
  const t = useTheme();
  const road = useLoop(450);
  const wheels = useLoop(450);
  const bob = useLoop(640);

  const roadStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -road.value * DASH * 2 }] }));
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wheels.value * 360}deg` }] }));
  // Up for the first half of each cycle, down for the second: a 1 pt bounce.
  const carStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(bob.value < 0.5 ? bob.value * 2 : (1 - bob.value) * 2) }],
  }));

  return (
    <View style={styles.lane} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.road, roadStyle]}>
        {Array.from({ length: Math.ceil(LANE_WIDTH / (DASH * 2)) + 2 }, (_, i) => (
          <View key={i} style={[styles.dash, { backgroundColor: t.textMuted }]} />
        ))}
      </Animated.View>

      <View style={styles.speed}>
        <SpeedLine delay={0} width={18} />
        <SpeedLine delay={200} width={12.6} />
        <SpeedLine delay={400} width={8} />
      </View>

      <Animated.View style={[styles.car, carStyle]}>
        <Svg width={CAR_W} height={CAR_H} viewBox={`0 0 ${CAR_W} ${CAR_H}`}>
          <Path
            d="M3 16.5 C3 14.5 4 13.6 6 13.2 L10 12.4 L15 7 C16 6 17 5.6 18.6 5.6 L28 5.6 C29.6 5.6 30.8 6.2 31.8 7.3 L35.6 12 L40.5 13 C42.6 13.5 43.6 14.6 43.6 16.5 L43.6 18 L3 18 Z"
            fill={t.accent}
          />
          <Path
            d="M16.4 8 C17 7.4 17.6 7.2 18.6 7.2 L23 7.2 L23 12 L12.6 12 Z M24.6 7.2 L28 7.2 C29 7.2 29.7 7.6 30.4 8.4 L33.4 12 L24.6 12 Z"
            fill={t.glass}
          />
          <Rect x={41} y={14.2} width={2.6} height={1.6} rx={0.8} fill="#FFE7A3" />
        </Svg>
        {[12, 34].map((cx) => (
          <Animated.View
            key={cx}
            style={[
              styles.tyre,
              { left: cx - TYRE / 2, top: 18 - TYRE / 2, backgroundColor: t.tyre },
              wheelStyle,
            ]}
          >
            <View style={[styles.spoke, { backgroundColor: t.hub }]} />
            <View style={[styles.hub, { backgroundColor: t.hub }]} />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

function SpeedLine({ delay, width }: { delay: number; width: number }) {
  const t = useTheme();
  const p = useLoop(600, delay);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.4 ? (p.value / 0.4) * 0.55 : ((1 - p.value) / 0.6) * 0.55,
    transform: [{ translateX: 6 - p.value * 16 }],
  }));
  return <Animated.View style={[styles.speedLine, { width, backgroundColor: t.textMuted }, style]} />;
}

/** "• • •" that hop one after another, for "Signing you in". */
export function LoadingDots() {
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const t = useTheme();
  const p = useLoop(1000, delay);
  // Hop up over 0-30% of the cycle, back down by 60%, then rest.
  const style = useAnimatedStyle(() => {
    const up = p.value < 0.3 ? p.value / 0.3 : p.value < 0.6 ? 1 - (p.value - 0.3) / 0.3 : 0;
    return { opacity: 0.45 + up * 0.55, transform: [{ translateY: -3 * up }] };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: t.accent }, style]} />;
}

const styles = StyleSheet.create({
  lane: { width: LANE_WIDTH, maxWidth: "100%", height: LANE_HEIGHT, overflow: "hidden" },
  road: { position: "absolute", left: 0, bottom: 3, flexDirection: "row", gap: DASH, opacity: 0.55 },
  dash: { width: DASH, height: 2, borderRadius: 1 },
  speed: {
    position: "absolute",
    bottom: 10,
    left: LANE_WIDTH / 2 - CAR_W / 2 - 22,
    width: 18,
    alignItems: "flex-end",
    gap: 3,
  },
  speedLine: { height: 2, borderRadius: 1 },
  car: { position: "absolute", bottom: 3, left: LANE_WIDTH / 2 - CAR_W / 2, width: CAR_W, height: CAR_H },
  tyre: {
    position: "absolute",
    width: TYRE,
    height: TYRE,
    borderRadius: TYRE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  spoke: { position: "absolute", top: 0.6, width: 1, height: 2.2 },
  hub: { width: 3.2, height: 3.2, borderRadius: 1.6 },
  dots: { flexDirection: "row", gap: 3, marginLeft: 3, paddingTop: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
