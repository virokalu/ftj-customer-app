import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand, HERO_HEIGHT_RATIO, RouteArc } from "@/components/route-arc";
import { AppText, Button } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { config } from "@/lib/config";
import { radius, spacing, useTheme } from "@/theme/theme";

// Sign-in only. Accounts are created on the FTJ website (decision, 19 Oct 2026).
// Layout follows 1-getting-started.png, "Sign in".
export default function SignInScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { signIn } = useAuth();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // No navigation call here: the route guard in _layout.tsx reacts to isSignedIn.
    } catch (e) {
      // Same wording for wrong email and wrong password, so nobody can probe which emails exist.
      setError(e instanceof ApiError && e.status === 401 ? "Invalid email or password." : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
        {/* Same hero as Welcome (same proportions, same route) so the two screens read as
            one flow. Both use HERO_HEIGHT_RATIO so the panels end at the same line. */}
        <View style={[styles.band, { backgroundColor: t.hero, paddingTop: insets.top + spacing.sm, minHeight: height * HERO_HEIGHT_RATIO }]}>
          <View style={styles.bandTop}>
            <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back_ios", web: "arrow_back_ios" }}
                size={20}
                tintColor={t.onHero}
              />
            </Pressable>
            <Brand />
          </View>

          <View style={styles.routeArea}>
            <RouteArc />
          </View>

          <Text style={[styles.title, { color: t.onHero }]} accessibilityRole="header">
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: t.onHeroMuted }]}>Sign in to see your vehicles.</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.fields, { backgroundColor: t.surface, borderColor: t.border }]}>
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
          </View>

          {/* TODO: "Forgot password?" sheet (needs the reset endpoints) and
              "Continue with phone number" (phone OTP is still an open decision). */}

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

          <View style={{ marginTop: spacing.md + spacing.xs }}>
            <Button label="Sign in" onPress={onSubmit} loading={submitting} />
          </View>

          {/* Pushes the footer to the bottom, like the buttons on Welcome. */}
          <View style={styles.footerSpacer} />

          <AppText muted style={{ textAlign: "center", fontSize: 14 }}>
            New to CargoDev?{" "}
            <Text
              style={{ color: t.accent, fontWeight: "600" }}
              accessibilityRole="link"
              onPress={() => Linking.openURL(config.websiteUrl)}
            >
              Create an account
            </Text>
          </AppText>
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
  // Band and form share one left edge (spacing.lg), like the Welcome screen.
  band: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg * 1.5,
    borderBottomRightRadius: radius.lg * 1.5,
  },
  bandTop: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  routeArea: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.lg },
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
