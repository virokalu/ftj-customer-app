import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { AppText, Button } from "@/components/ui";
import { config } from "@/lib/config";
import { radius, spacing, useTheme } from "@/theme/theme";

type SymbolName = SymbolViewProps["name"];

const features: { icon: SymbolName; title: string; body: string }[] = [
  {
    icon: { ios: "ferry.fill", android: "directions_boat", web: "directions_boat" },
    title: "Live shipment timeline",
    body: "Booking, departure and arrival dates in one place",
  },
  {
    icon: { ios: "doc.text.fill", android: "description", web: "description" },
    title: "EC and BL on each vehicle",
    body: "Open or share documents from your car's page",
  },
  {
    icon: { ios: "photo.fill", android: "image", web: "image" },
    title: "Photos from the yard",
    body: "See your car before it ships",
  },
];

// First screen for signed-out users (design: 1-getting-started.png, "Welcome").
// "Create account" opens the FTJ website: the app is sign-in only (decision, 19 Oct 2026).
export default function WelcomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      {/* Light icons over the dark hero, whatever the phone's theme. */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.md }}
        bounces={false}
      >
        {/* Spare height on tall phones is shared 2:1 between the hero (around the route)
            and the space above the buttons, so neither area ends up with one big gap. */}
        <View style={[styles.hero, { backgroundColor: t.hero, paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.brand}>
            <Text style={[styles.brandMark, { color: t.accent }]}>/F</Text>
            <Text style={[styles.brandName, { color: t.onHero }]}>CargoDev</Text>
          </View>

          <View style={styles.routeArea}>
            <RouteArc />
          </View>

          <Text style={[styles.headline, { color: t.onHero }]} accessibilityRole="header">
            Your car, from auction to your door.
          </Text>
          <Text style={[styles.subhead, { color: t.onHeroMuted }]}>
            Follow every step of your vehicle’s journey, with photos and documents as soon as they’re ready.
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.features}>
            {features.map((f) => (
              <View key={f.title} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: t.accentSoft }]}>
                  <SymbolView name={f.icon} size={24} tintColor={t.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 15, fontWeight: "600" }}>{f.title}</AppText>
                  <AppText muted style={{ fontSize: 13, marginTop: 2 }}>
                    {f.body}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.buttonSpacer} />

          <View style={styles.buttons}>
            <Button label="Create account" onPress={() => Linking.openURL(config.websiteUrl)} />
            <Button label="I already have an account" variant="secondary" onPress={() => router.push("/sign-in")} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Decorative Japan -> ship -> your port route. Drawn in a fixed viewBox and scaled to the
// screen width; the ship badge is positioned in the same viewBox units, as percentages.
const VB = { w: 300, h: 110 };
const START = { x: 8, y: 88 };
const SHIP = { x: 140, y: 26 };
const END = { x: 290, y: 52 };

function RouteArc() {
  const t = useTheme();
  return (
    <View
      style={{ width: "100%", aspectRatio: VB.w / VB.h }}
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
          { backgroundColor: t.accent, left: `${(SHIP.x / VB.w) * 100}%`, top: `${(SHIP.y / VB.h) * 100}%` },
        ]}
      >
        <SymbolView name={{ ios: "ferry.fill", android: "directions_boat", web: "directions_boat" }} size={22} tintColor={t.onAccent} />
      </View>

      <Text style={[styles.routeLabel, { color: t.onHeroMuted, left: 0, top: `${(START.y / VB.h) * 100}%` }]}>Japan</Text>
      <Text style={[styles.routeLabel, { color: t.onHeroMuted, right: 0, top: `${(END.y / VB.h) * 100}%` }]}>Your port</Text>
    </View>
  );
}

const SHIP_SIZE = 42;

const styles = StyleSheet.create({
  // Hero and body share one left edge (spacing.lg) so brand, headline and features line up.
  hero: {
    flexGrow: 2,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg * 1.5,
    borderBottomRightRadius: radius.lg * 1.5,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandMark: { fontSize: 26, fontWeight: "900", fontStyle: "italic" },
  brandName: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  routeArea: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.lg },
  headline: { fontSize: 30, fontWeight: "800", lineHeight: 36, letterSpacing: -0.5 },
  subhead: { fontSize: 15, lineHeight: 21, marginTop: spacing.sm },
  body: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  features: { gap: spacing.md + spacing.xs },
  buttonSpacer: { flexGrow: 1, minHeight: spacing.xl },
  buttons: { gap: spacing.sm + spacing.xs },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  ship: {
    position: "absolute",
    width: SHIP_SIZE,
    height: SHIP_SIZE,
    marginLeft: -SHIP_SIZE / 2,
    marginTop: -SHIP_SIZE / 2,
    borderRadius: SHIP_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  routeLabel: { position: "absolute", fontSize: 11, marginTop: spacing.sm + 2 },
});
