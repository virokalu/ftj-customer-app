import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthHero, heroText, welcomeCopy } from "@/components/auth-hero";
import { AppText, Button } from "@/components/ui";
import { WordReveal } from "@/components/word-reveal";
import { useFirstVisit } from "@/lib/first-visit";
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

// Intro timings in ms after the screen mounts. The route (ship sailing) runs 200-1300
// inside RouteArc; the words follow it. Reanimated skips all of this under Reduce Motion.
const intro = {
  brand: 0,
  headline: 1200,
  headlineStagger: 60,
  subhead: 1700,
  features: 1800,
  featureStagger: 80,
  buttons: 2100,
};

// First screen for signed-out users (design: 1-getting-started.png, "Welcome").
// "Create account" opens the FTJ website: the app is sign-in only (decision, 19 Oct 2026).
export default function WelcomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // The intro plays the first time this screen opens in an app run, not on every visit.
  const firstVisit = useFirstVisit("welcome");

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      {/* Light icons over the dark hero, whatever the phone's theme. */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.md }}
        bounces={false}
      >
        {/* Same hero as Sign in, so the brand and route stay put when the screens cross-fade. */}
        <AuthHero
          routeAnimated={firstVisit}
          brandEntering={firstVisit ? FadeInDown.delay(intro.brand).duration(400) : undefined}
        >
          <WordReveal
            text={welcomeCopy.headline}
            style={[heroText.headline, { color: t.onHero }]}
            delay={intro.headline}
            stagger={intro.headlineStagger}
            animated={firstVisit}
            header
          />
          <Animated.Text
            entering={firstVisit ? FadeIn.delay(intro.subhead).duration(400) : undefined}
            style={[heroText.subhead, { color: t.onHeroMuted }]}
          >
            {welcomeCopy.subhead}
          </Animated.Text>
        </AuthHero>

        <View style={styles.body}>
          <View style={styles.features}>
            {features.map((f, i) => (
              <Animated.View
                key={f.title}
                entering={firstVisit ? FadeInUp.delay(intro.features + i * intro.featureStagger).duration(400) : undefined}
                style={styles.feature}
              >
                <View style={[styles.featureIcon, { backgroundColor: t.accentSoft }]}>
                  <SymbolView name={f.icon} size={24} tintColor={t.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 15, fontWeight: "600" }}>{f.title}</AppText>
                  <AppText muted style={{ fontSize: 13, marginTop: 2 }}>
                    {f.body}
                  </AppText>
                </View>
              </Animated.View>
            ))}
          </View>

          <View style={styles.buttonSpacer} />

          <Animated.View entering={firstVisit ? FadeIn.delay(intro.buttons).duration(400) : undefined} style={styles.buttons}>
            {/* Sign in is the main action: accounts are created on the website. */}
            <Button label="Sign in" haptic pop onPress={() => router.push("/sign-in")} />
            <Button
              label="Create an account online"
              variant="secondary"
              haptic
              pop
              onPress={() => Linking.openURL(config.websiteUrl)}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  features: { gap: spacing.md + spacing.xs },
  buttonSpacer: { flexGrow: 1, minHeight: spacing.xl },
  buttons: { gap: spacing.sm + spacing.xs },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
