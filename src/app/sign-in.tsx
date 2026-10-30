import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  Alert,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
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
import { LoadingDots, RoadLoader } from "@/components/road-loader";
import { JourneySteps } from "@/components/journey-steps";
import { AppText, Button, PopPressable } from "@/components/ui";
import { WordReveal } from "@/components/word-reveal";
import { useFirstVisit } from "@/lib/first-visit";
import { useAuth } from "@/features/auth/auth-context";
import { prefetchHome } from "@/features/vehicles/hooks";
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

// Sign-in only. Accounts are created on the FTJ website (decision, 19 Oct 2026).
// Layout follows 1-getting-started.png, "Sign in".
export default function SignInScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // The intro plays the first time this screen opens in an app run, not on every visit.
  const firstVisit = useFirstVisit("sign-in");
  const { signIn } = useAuth();
  const queryClient = useQueryClient();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // "Still working" notice for slow starts (the hosted API can take up to a minute to wake up).
  const [slow, setSlow] = useState(false);
  // The fields card folds into the road loader while signing in: "checking" = the login
  // request, "loading" = pre-loading Home's data so it opens filled in, "done" = a short
  // "Welcome back" just before Home opens.
  const [phase, setPhase] = useState<"form" | "checking" | "loading" | "done">("form");
  const reduceMotion = useReducedMotion();
  // Horizontal shake of the field card when sign-in fails.
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  // fold: 0 = the email/password rows, 1 = the one-row status card. The card shrinks toward its
  // centre inside a wrapper that keeps the full height, so nothing below it moves.
  const fold = useSharedValue(0);
  const fullHeight = useSharedValue(0);
  useEffect(() => {
    fold.set(
      withTiming(phase === "form" ? 0 : 1, {
        duration: reduceMotion ? 0 : 350,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [phase, reduceMotion, fold]);
  const reserveStyle = useAnimatedStyle(() => (fullHeight.value > 0 ? { height: fullHeight.value } : {}));
  const cardStyle = useAnimatedStyle(() => {
    if (fullHeight.value === 0) return {};
    const height = fullHeight.value + (STATUS_HEIGHT - fullHeight.value) * fold.value;
    return { height, marginTop: (fullHeight.value - height) / 2 };
  });
  const rowsStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, fold.value * 1.6),
    transform: [{ scale: 1 - 0.04 * fold.value }],
  }));
  const statusStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, (fold.value - 0.4) / 0.6) }));

  // The "signed in" tick pops in once: from small, just past full size, then settles. Timed
  // steps only (no spring), so it does not bounce. Under Reduce Motion it simply appears.
  const tick = useSharedValue(1);
  useEffect(() => {
    if (phase !== "done" || reduceMotion) return;
    tick.set(0.4);
    tick.set(
      withSequence(
        withTiming(1.15, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  }, [phase, reduceMotion, tick]);
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scale: tick.value }] }));

  const canSubmit = email.trim().length > 0 && password.length > 0;

  function shakeFields() {
    if (reduceMotion) return;
    const step = (x: number) => withTiming(x, { duration: 50 });
    shake.set(withSequence(step(-8), step(8), step(-6), step(6), step(-3), step(0)));
  }

  async function onSubmit() {
    if (submitting) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setPhase("checking");
    const slowTimer = setTimeout(() => setSlow(true), 5000);
    try {
      await signIn(email, password, {
        // Signed in: keep the car driving while Home's data loads (so Home opens filled in;
        // capped at 8 s, anything later finishes loading on Home), then a short "Welcome back".
        beforeEnter: async () => {
          clearTimeout(slowTimer);
          setSlow(false);
          setPhase("loading");
          await Promise.race([prefetchHome(queryClient), wait(8000)]);
          setPhase("done");
          await wait(reduceMotion ? 300 : 800);
        },
      });
      // No navigation call here: the route guard in _layout.tsx reacts to isSignedIn.
    } catch (e) {
      // The backend answers 400 for any bad credentials (same wording for wrong email and wrong
      // password, so nobody can probe which emails exist), 403 when locked, 429 when rate limited.
      // Shown as a system alert, not inside the form: the layout never grows (so the screen
      // never starts scrolling), it sits above the keyboard, and VoiceOver reads it at once.
      // The typed email and password are kept; the card unfolds back to them, then shakes.
      setPhase("form");
      shakeFields();
      Alert.alert(signInErrorTitle(e), signInErrorMessage(e), [{ text: "OK" }]);
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setSubmitting(false);
    }
  }

  function signInErrorTitle(e: unknown): string {
    if (e instanceof ApiError && e.status === 403) return "Account locked";
    if (e instanceof ApiError && e.status === 0) return "No connection";
    return "Couldn't sign in";
  }

  function signInErrorMessage(e: unknown): string {
    if (!(e instanceof ApiError)) return "Something went wrong. Please try again.";
    if (e.status === 0) return "No connection. Check your internet and try again.";
    // Malformed input (bad email format) comes back with fieldErrors; wrong credentials without.
    if (e.status === 400) {
      return e.fieldErrors?.email ? "Enter a valid email address." : "Email or password is incorrect.";
    }
    // The lock message is the one server text the contract allows us to show (§2.4).
    if (e.status === 403) return e.message;
    if (e.status === 429) return "Too many attempts. Please wait a moment and try again.";
    if (e.status >= 500) return "Something went wrong on our side. Please try again.";
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
        <AuthHero routeAnimated={firstVisit} matchWelcomeHeight>
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
          <JourneySteps animated={firstVisit} delay={intro.steps} stagger={intro.stepStagger} />
        </AuthHero>

        <View style={styles.form}>
          {/* Outer view slides in once; inner view shakes on errors (two separate transforms). */}
          <Animated.View entering={firstVisit ? FadeInUp.delay(intro.fields).duration(400) : undefined}>
            <Animated.View style={reserveStyle}>
              <Animated.View
                // Locked while signing in, so nothing changes under a request in flight.
                style={[
                  styles.fields,
                  styles.foldable,
                  { backgroundColor: t.surface, borderColor: t.border },
                  cardStyle,
                  shakeStyle,
                ]}
                pointerEvents={submitting ? "none" : "auto"}
              >
                {/* The rows keep their natural height inside the folding card: that height is the
                 card's full size (plus its two hairline borders). They stay mounted, so the typed
                 email and password survive the fold. */}
                <Animated.View
                  style={rowsStyle}
                  onLayout={(e) => {
                    const height = e.nativeEvent.layout.height + StyleSheet.hairlineWidth * 2;
                    if (Math.abs(height - fullHeight.value) > 0.5) fullHeight.set(height);
                  }}
                >
                  <Field icon={{ ios: "envelope", android: "mail", web: "mail" }} label="Email">
                    <TextInput
                      editable={!submitting}
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
                  <View
                    style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 48 }}
                  />
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
                      editable={!submitting}
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

                <Animated.View
                  pointerEvents="none"
                  style={[styles.status, statusStyle]}
                  accessibilityLiveRegion="polite"
                >
                  {phase === "done" ? (
                    <View style={styles.statusLine}>
                      <Animated.View style={[styles.statusCheck, { backgroundColor: t.accent }, tickStyle]}>
                        <SymbolView
                          name={{ ios: "checkmark", android: "check", web: "check" }}
                          size={11}
                          tintColor={t.onAccent}
                        />
                      </Animated.View>
                      <Text style={[styles.statusText, { color: t.text }]} numberOfLines={1}>
                        Welcome back
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* "Road moves under the car": the car keeps driving until Home is ready. */}
                      <RoadLoader />
                      <View style={styles.statusLine}>
                        <Text style={[styles.statusText, { color: t.text }]} numberOfLines={1}>
                          {slow ? "Still connecting, this can take a minute" : "Signing you in"}
                        </Text>
                        <LoadingDots />
                      </View>
                    </>
                  )}
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </Animated.View>

          {/* Text only for now. TODO: open the "Forgot password?" sheet (needs the reset endpoints).
              Also TODO: "Continue with phone number" (phone OTP is still an open decision). */}
          <Animated.View
            entering={firstVisit ? FadeIn.delay(intro.fields).duration(400) : undefined}
            style={styles.forgot}
          >
            <PopPressable accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: t.accentText, fontSize: 14, fontWeight: "600" }}>Forgot password?</Text>
            </PopPressable>
          </Animated.View>

          <Animated.View
            entering={firstVisit ? FadeIn.delay(intro.button).duration(400) : undefined}
            style={{ marginTop: spacing.md + spacing.xs }}
          >
            {/* No loading state on the button itself: the fields card above shows the progress. */}
            <Button label="Sign in" haptic pop onPress={onSubmit} />
            <PopPressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Back to welcome"
              hitSlop={8}
              containerStyle={styles.backTap}
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
            </PopPressable>
          </Animated.View>

          {/* Pushes the footer to the bottom, like the buttons on Welcome. */}
          <View style={styles.footerSpacer} />

          <Animated.View entering={firstVisit ? FadeIn.delay(intro.footer).duration(400) : undefined}>
            <View style={styles.footerRow}>
              <AppText muted style={{ fontSize: 14 }}>
                New to FTJ Exports?{" "}
              </AppText>
              <PopPressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => Linking.openURL(config.websiteUrl)}
              >
                <Text style={{ color: t.accentText, fontSize: 14, fontWeight: "600" }}>
                  Create an account
                </Text>
              </PopPressable>
            </View>
            {/* Developer credit: CargoDev builds FTJ's apps; this is FTJ's customer app. */}
            <View style={styles.credit}>
              <SymbolView
                name={{ ios: "bolt.fill", android: "bolt", web: "bolt" }}
                size={12}
                tintColor={t.accent}
              />
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

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Height of the folded status card: the road loader and one line of text.
const STATUS_HEIGHT = 80;

const styles = StyleSheet.create({
  foldable: { overflow: "hidden" },
  status: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  statusLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusCheck: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  statusText: { flexShrink: 1, fontSize: 15, fontWeight: "600" },
  credit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  backTap: { alignSelf: "center", marginTop: spacing.md },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  footerRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 30, fontWeight: "800", lineHeight: 36, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: spacing.sm },
  form: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
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
