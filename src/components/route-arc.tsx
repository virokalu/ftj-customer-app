import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { spacing, useTheme } from "@/theme/theme";

/**
 * Share of the screen height the dark hero panel takes on Welcome and Sign in, so both
 * screens' panels end at the same line. Content can still make it taller on small phones.
 */
export const HERO_HEIGHT_RATIO = 0.55;

/** "/F CargoDev" brand row, for use on the dark hero panels (Welcome, Sign in). */
export function Brand() {
  const t = useTheme();
  return (
    <View style={styles.brand}>
      <Text style={[styles.brandMark, { color: t.accent }]}>/F</Text>
      <Text style={[styles.brandName, { color: t.onHero }]}>CargoDev</Text>
    </View>
  );
}

// Decorative Japan -> ship -> your port route. Drawn in a fixed viewBox and scaled to the
// container width; the ship badge is positioned in the same viewBox units, as percentages.
const VB = { w: 300, h: 110 };
const START = { x: 8, y: 88 };
const SHIP = { x: 140, y: 26 };
const END = { x: 290, y: 52 };

export function RouteArc({ shipSize = 42, style }: { shipSize?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[{ width: "100%", aspectRatio: VB.w / VB.h }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`}>
        <Path d={`M ${START.x} ${START.y} Q 50 30 ${SHIP.x} ${SHIP.y}`} stroke={t.accent} strokeWidth={2} fill="none" />
        <Path
          d={`M ${SHIP.x} ${SHIP.y} Q 230 18 ${END.x} ${END.y}`}
          stroke={t.onHeroMuted}
          strokeWidth={1.5}
          strokeDasharray="2 4"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={START.x} cy={START.y} r={4} fill={t.accent} />
        <Circle cx={END.x} cy={END.y} r={5} fill={t.hero} stroke={t.onHero} strokeWidth={1.5} />
      </Svg>

      <View
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
        ]}
      >
        <SymbolView
          name={{ ios: "ferry.fill", android: "directions_boat", web: "directions_boat" }}
          size={Math.round(shipSize * 0.52)}
          tintColor={t.onAccent}
        />
      </View>

      <Text style={[styles.routeLabel, { color: t.onHeroMuted, left: 0, top: `${(START.y / VB.h) * 100}%` }]}>Japan</Text>
      <Text style={[styles.routeLabel, { color: t.onHeroMuted, right: 0, top: `${(END.y / VB.h) * 100}%` }]}>Your port</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandMark: { fontSize: 26, fontWeight: "900", fontStyle: "italic" },
  brandName: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  ship: { position: "absolute", alignItems: "center", justifyContent: "center" },
  routeLabel: { position: "absolute", fontSize: 11, marginTop: spacing.sm + 2 },
});
