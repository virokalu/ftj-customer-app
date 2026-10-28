import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthHero } from "@/components/auth-hero";
import { AppText, Button } from "@/components/ui";
import { WordReveal } from "@/components/word-reveal";
import { useFirstVisit } from "@/lib/first-visit";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { config } from "@/lib/config";
import { radius, spacing, useTheme } from "@/theme/theme";

// Intro timings in ms after the screen mounts. The ship reaches mid-route at about 1300
// inside RouteArc; the form comes in meanwhile. Reanimated skips these under Reduce Motion.
const intro = {
  title: 300,
  titleStagger: 60,
  subtitle: 450,
  fields: 500,
  steps: 550,
  stepStagger: 80,
  button: 600,
  footer: 700,
};

// What the user follows once signed in, shown as pills in the hero.
const journeySteps: { icon: SymbolViewProps["name"]; label: string }[] = [
  { icon: { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }, label: "Booked" },
  { icon: { ios: "ferry.fill", android: "directions_boat", web: "directions_boat" }, label: "On the ship" },
  { icon: { ios: "flag.fill", android: "flag", web: "flag" }, label: "Arrived" },
];

// Sign-in only. Accounts are created on the FTJ website (decision, 19 Oct 2026).
// Layout follows 1-getting-started.png, "Sign in".
export default function SignInScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // The intro plays the first time this screen opens in an app run, not on every visit.
  const firstVisit = useFirstVisit("sign-in");
  const { signIn } = useAuth();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const reduceMotion = useReducedMotion();
  // Horizontal shake of the field card when sign-in fails.
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const canSubmit = email.trim().length > 0 && password.length > 0;

  function shakeFields() {
    if (reduceMotion) return;
    const step = (x: number) => withTiming(x, { duration: 50 });
    shake.set(withSequence(step(-8), step(8), step(-6), step(6), step(-3), step(0)));
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // No navigation call here: the route guard in _layout.tsx reacts to isSignedIn.
    } catch (e) {
      // The backend answers 400 for any bad credentials (same wording for wrong email and wrong
      // password, so nobody can probe which emails exist), 403 when locked, 429 when rate limited.
      setError(signInErrorMessage(e));
      shakeFields();
    } finally {
      setSubmitting(false);
    }
  }

  function signInErrorMessage(e: unknown): string {
    if (!(e instanceof ApiError)) return "Something went wrong. Please try again.";
    if (e.status === 400) return "Invalid email or password.";
    if (e.status === 403) return "Too many failed attempts. Your account is locked for a few minutes.";
    if (e.status === 429) return "Too many attempts. Please wait a moment and try again.";
    return "Something went wrong. Please try again.";
  }

  function goBack() {
    // Normally we came from Welcome; after a sign-out the stack may hold only this screen.
    if (router.canGoBack()) router.back();
    else router.replace("/welcome");
  }

  const inputStyle = [styles.input, { color: t.text }];

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      {/* Light icons over the dark band, whatever the phone's theme. */}
      <StatusBar style="light" />
      {/* One scroll view for band + form; iOS scrolls the focused field above the keyboard. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        bounces={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.md }}
      >
        {/* Same hero as Welcome (same height too), so the panel stays put when the screens cross-fade. */}
        <AuthHero routeAnimated={firstVisit}>
          <WordReveal
            text="Welcome back"
            style={[styles.title, { color: t.onHero }]}
            delay={intro.title}
            stagger={intro.titleStagger}
            animated={firstVisit}
            header
          />
          <Animated.Text
            entering={firstVisit ? FadeIn.delay(intro.subtitle).duration(400) : undefined}
            style={[styles.subtitle, { color: t.onHeroMuted }]}
          >
            Sign in to see your vehicles.
          </Animated.Text>
          {/* What the user follows once signed in, right under the text it belongs to. */}
          <View style={styles.steps}>
            {journeySteps.map((s, i) => (
              <Animated.View
                key={s.label}
                entering={firstVisit ? FadeInUp.delay(intro.steps + i * intro.stepStagger).duration(400) : undefined}
                style={[styles.step, { backgroundColor: t.heroChip }]}
              >
                <SymbolView name={s.icon} size={15} tintColor={i === journeySteps.length - 1 ? t.accent : t.onHero} />
                <AppText numberOfLines={1} style={{ color: t.onHero, fontSize: 13, fontWeight: "500" }}>
                  {s.label}
                </AppText>
              </Animated.View>
            ))}
          </View>
        </AuthHero>

        <View style={styles.form}>
          {/* Outer view slides in once; inner view shakes on errors (two separate transforms). */}
          <Animated.View entering={firstVisit ? FadeInUp.delay(intro.fields).duration(400) : undefined}>
            <Animated.View style={[styles.fields, { backgroundColor: t.surface, borderColor: t.border }, shakeStyle]}>
              <Field icon={{ ios: "envelope", android: "mail", web: "mail" }} label="Email">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  placeholderTextColor={t.textMuted}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="username"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  submitBehavior="submit"
                  style={inputStyle}
                />
              </Field>
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 48 }} />
              <Field
                icon={{ ios: "lock", android: "lock", web: "lock" }}
                label="Password"
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    hitSlop={12}
                  >
                    <SymbolView
                      name={
                        showPassword
                          ? { ios: "eye.slash", android: "visibility_off", web: "visibility_off" }
                          : { ios: "eye", android: "visibility", web: "visibility" }
                      }
                      size={18}
                      tintColor={t.textMuted}
                    />
                  </Pressable>
                }
              >
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={t.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={() => canSubmit && onSubmit()}
                  style={inputStyle}
                />
              </Field>
            </Animated.View>
          </Animated.View>

          {/* Text only for now. TODO: open the "Forgot password?" sheet (needs the reset endpoints).
              Also TODO: "Continue with phone number" (phone OTP is still an open decision). */}
          <Animated.View
            entering={firstVisit ? FadeIn.delay(intro.fields).duration(400) : undefined}
            style={styles.forgot}
          >
            <Pressable accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: t.accent, fontSize: 14, fontWeight: "600" }}>Forgot password?</Text>
            </Pressable>
          </Animated.View>

          {error ? (
            <View style={[styles.error, { backgroundColor: t.accentSoft }]} accessibilityRole="alert">
              <SymbolView
                name={{ ios: "exclamationmark.circle.fill", android: "error", web: "error" }}
                size={16}
                tintColor={t.danger}
              />
              <AppText style={{ flex: 1, color: t.danger, fontSize: 14 }}>{error}</AppText>
            </View>
          ) : null}

          <Animated.View entering={firstVisit ? FadeIn.delay(intro.button).duration(400) : undefined} style={{ marginTop: spacing.md + spacing.xs }}>
            <Button label="Sign in" onPress={onSubmit} loading={submitting} />
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Back to welcome"
              hitSlop={8}
              style={styles.back}
            >
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back_ios_new", web: "arrow_back_ios_new" }}
                size={12}
                tintColor={t.textMuted}
              />
              <AppText muted style={{ fontSize: 14, fontWeight: "500" }}>
                Back to welcome
              </AppText>
            </Pressable>
          </Animated.View>

          {/* Pushes the footer to the bottom, like the buttons on Welcome. */}
          <View style={styles.footerSpacer} />

          <Animated.View entering={firstVisit ? FadeIn.delay(intro.footer).duration(400) : undefined}>
            <AppText muted style={{ textAlign: "center", fontSize: 14 }}>
              New to FTJ Exports?{" "}
              <Text
                style={{ color: t.accent, fontWeight: "600" }}
                accessibilityRole="link"
                onPress={() => Linking.openURL(config.websiteUrl)}
              >
                Create an account
              </Text>
            </AppText>
            {/* Developer credit: CargoDev builds FTJ's apps; this is FTJ's customer app. */}
            <View style={styles.credit}>
              <SymbolView name={{ ios: "bolt.fill", android: "bolt", web: "bolt" }} size={12} tintColor={t.accent} />
              <AppText muted style={{ fontSize: 12 }}>
                Powered by <AppText style={{ fontSize: 12, fontWeight: "600" }}>CargoDev</AppText>
              </AppText>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

// One row of the grouped field card: icon, small label above the input, optional trailing control.
function Field({
  icon,
  label,
  trailing,
  children,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <SymbolView name={icon} size={18} tintColor={t.textMuted} />
      <View style={{ flex: 1 }}>
        <AppText muted style={{ fontSize: 12 }}>
          {label}
        </AppText>
        {children}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  credit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  // One row: the three pills share the width equally, so they always fit side by side.
  steps: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md + spacing.xs },
  step: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: 999,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: { fontSize: 30, fontWeight: "800", lineHeight: 36, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: spacing.sm },
  form: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  footerSpacer: { flexGrow: 1, minHeight: spacing.lg },
  forgot: { alignSelf: "flex-end", marginTop: spacing.sm + spacing.xs },
  fields: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  input: { fontSize: 16, paddingVertical: 2, paddingHorizontal: 0 },
});
