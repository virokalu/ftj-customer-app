import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { spacing, useTheme } from "@/theme/theme";

/**
 * FTJ letters (the app icon's artwork) + "Exports": brand row for the dark hero panels (Welcome, Sign in).
 * This is FTJ's customer app; CargoDev (the developer) is credited only on Sign in.
 */
export function Brand() {
  const t = useTheme();
  return (
    // One element for screen readers: "FTJ Exports", not an image plus "Exports".
    <View style={styles.brand} accessible accessibilityLabel="FTJ Exports">
      {/* The app icon's letters (assets/brand/ftj-icon.svg), cropped tight, transparent background. */}
      <Image source={require("../../assets/brand/ftj-letters.png")} style={styles.brandMark} />
      <Text style={[styles.brandName, { color: t.onHero }]}>Exports</Text>
    </View>
  );
}

// Decorative Japan -> ship -> your port route. Drawn in a fixed viewBox and scaled to the
// container width; the ship badge is positioned in the same viewBox units, as percentages.
const VB = { w: 300, h: 110 };
const START = { x: 8, y: 88 };
const SAILED_CTRL = { x: 50, y: 30 };
const SHIP = { x: 140, y: 26 };
const AHEAD_CTRL = { x: 230, y: 18 };
const END = { x: 290, y: 52 };

// Point on the sailed leg (a quadratic bezier) at progress p in 0..1.
function sailedPoint(p: number) {
  "worklet";
  const a = (1 - p) * (1 - p);
  const b = 2 * (1 - p) * p;
  const c = p * p;
  return {
    x: a * START.x + b * SAILED_CTRL.x + c * SHIP.x,
    y: a * START.y + b * SAILED_CTRL.y + c * SHIP.y,
  };
}

// Length of the sailed leg, so the line can be "drawn" with a dash offset.
const SAILED_LENGTH = (() => {
  let length = 0;
  let prev = sailedPoint(0);
  for (let i = 1; i <= 50; i++) {
    const next = sailedPoint(i / 50);
    length += Math.hypot(next.x - prev.x, next.y - prev.y);
    prev = next;
  }
  return Math.ceil(length);
})();

// Intro timings in ms. The ship sails while the line draws behind it.
const SAIL_DELAY = 200;
const SAIL_DURATION = 1100;
const ARRIVE = SAIL_DELAY + SAIL_DURATION;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * `animated` plays a one-off intro (Welcome, Sign in): the ship sails from Japan drawing the
 * route, then the rest of the route appears and the ship stays still. Skipped when Reduce Motion is on.
 */
export function RouteArc({
  shipSize = 42,
  animated = false,
  style,
}: {
  shipSize?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const play = animated && !reduceMotion;

  // Every value starts at its final state unless the intro plays, so the static route is unchanged.
  const sail = useSharedValue(play ? 0 : 1);
  const ahead = useSharedValue(play ? 0 : 1);
  const portPulse = useSharedValue(1);
  const shipPop = useSharedValue(play ? 0.6 : 1);
  // Viewbox units -> pixels, set once the container is laid out.
  const scale = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    sail.value = withDelay(SAIL_DELAY, withTiming(1, { duration: SAIL_DURATION, easing: Easing.inOut(Easing.cubic) }));
    shipPop.value = withDelay(SAIL_DELAY, withSpring(1, { damping: 10, stiffness: 140 }));
    ahead.value = withDelay(ARRIVE - 200, withTiming(1, { duration: 400 }));
    portPulse.value = withDelay(
      ARRIVE,
      withSequence(withTiming(1.4, { duration: 200 }), withTiming(1, { duration: 250 })),
    );
  }, [play, sail, shipPop, ahead, portPulse]);

  const sailedProps = useAnimatedProps(() => ({ strokeDashoffset: SAILED_LENGTH * (1 - sail.value) }));
  const aheadProps = useAnimatedProps(() => ({ opacity: ahead.value }));
  const portProps = useAnimatedProps(() => ({ r: 5 * portPulse.value }));

  // The ship's resting place is its CSS position; while sailing it is offset back along the curve.
  const shipStyle = useAnimatedStyle(() => {
    const at = sailedPoint(sail.value);
    // Tilt with the curve, softened so the ship climbs rather than points at the sky.
    const dx = 2 * (1 - sail.value) * (SAILED_CTRL.x - START.x) + 2 * sail.value * (SHIP.x - SAILED_CTRL.x);
    const dy = 2 * (1 - sail.value) * (SAILED_CTRL.y - START.y) + 2 * sail.value * (SHIP.y - SAILED_CTRL.y);
    const tilt = Math.atan2(dy, dx) * 0.35;
    return {
      transform: [
        { translateX: (at.x - SHIP.x) * scale.value },
        { translateY: (at.y - SHIP.y) * scale.value },
        { rotate: `${tilt}rad` },
        { scale: shipPop.value },
      ],
    };
  });

  const labelEntering = play ? FadeIn.delay(ARRIVE - 200).duration(400) : undefined;

  return (
    <View
      style={[{ width: "100%", aspectRatio: VB.w / VB.h }, style]}
      onLayout={(e) => {
        scale.value = e.nativeEvent.layout.width / VB.w;
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`}>
        <AnimatedPath
          d={`M ${START.x} ${START.y} Q ${SAILED_CTRL.x} ${SAILED_CTRL.y} ${SHIP.x} ${SHIP.y}`}
          stroke={t.accent}
          strokeWidth={2}
          strokeDasharray={`${SAILED_LENGTH} ${SAILED_LENGTH}`}
          animatedProps={sailedProps}
          fill="none"
        />
        <AnimatedPath
          d={`M ${SHIP.x} ${SHIP.y} Q ${AHEAD_CTRL.x} ${AHEAD_CTRL.y} ${END.x} ${END.y}`}
          stroke={t.onHeroMuted}
          strokeWidth={1.5}
          strokeDasharray="2 4"
          strokeLinecap="round"
          animatedProps={aheadProps}
          fill="none"
        />
        <Circle cx={START.x} cy={START.y} r={4} fill={t.accent} />
        <AnimatedCircle
          cx={END.x}
          cy={END.y}
          r={5}
          fill={t.hero}
          stroke={t.onHero}
          strokeWidth={1.5}
          animatedProps={portProps}
        />
      </Svg>

      <Animated.View
        style={[
          styles.ship,
          {
            width: shipSize,
            height: shipSize,
            marginLeft: -shipSize / 2,
            marginTop: -shipSize / 2,
            borderRadius: shipSize / 2,
            backgroundColor: t.accent,
            left: `${(SHIP.x / VB.w) * 100}%`,
            top: `${(SHIP.y / VB.h) * 100}%`,
          },
          shipStyle,
        ]}
      >
        <SymbolView
          name={{ ios: "ferry.fill", android: "directions_boat", web: "directions_boat" }}
          size={Math.round(shipSize * 0.52)}
          tintColor={t.onAccent}
        />
      </Animated.View>

      <Animated.Text
        entering={labelEntering}
        style={[styles.routeLabel, { color: t.onHeroMuted, left: 0, top: `${(START.y / VB.h) * 100}%` }]}
      >
        Japan
      </Animated.Text>
      <Animated.Text
        entering={labelEntering}
        style={[styles.routeLabel, { color: t.onHeroMuted, right: 0, top: `${(END.y / VB.h) * 100}%` }]}
      >
        Your port
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  // Keeps the artwork's 556x194 proportions; about the height of the "Exports" capitals.
  brandMark: { height: 22, aspectRatio: 556 / 194 },
  brandName: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  ship: { position: "absolute", alignItems: "center", justifyContent: "center" },
  routeLabel: { position: "absolute", fontSize: 11, marginTop: spacing.sm + 2 },
});
