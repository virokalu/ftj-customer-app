import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppText, Button, Screen } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { config } from "@/lib/config";
import { radius, spacing, useTheme } from "@/theme/theme";

// Sign-in only. Accounts are created on the FTJ website (decision, 19 Oct 2026).
// Layout follows 1-getting-started.png, "Sign in".
export default function SignInScreen() {
  const t = useTheme();
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
    <Screen>
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        style={styles.back}
      >
        <SymbolView
          name={{ ios: "chevron.left", android: "arrow_back_ios", web: "arrow_back_ios" }}
          size={20}
          tintColor={t.accent}
        />
      </Pressable>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* Back button stays pinned at the top; the form is centred in the space below it
            (and still scrolls when the keyboard leaves too little room). */}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <View style={[styles.logo, { backgroundColor: t.hero }]}>
            <Text style={[styles.logoMark, { color: t.accent }]}>/F</Text>
          </View>

          <AppText style={styles.title} accessibilityRole="header">
            Welcome back
          </AppText>
          <AppText muted style={{ fontSize: 15 }}>
            Sign in to see your vehicles.
          </AppText>

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

          {error ? <AppText style={{ color: t.danger, marginTop: spacing.md }}>{error}</AppText> : null}

          <View style={{ marginTop: spacing.lg }}>
            <Button label="Sign in" onPress={onSubmit} loading={submitting} />
          </View>

          <AppText muted style={{ textAlign: "center", fontSize: 14, marginTop: spacing.lg }}>
            New to CargoDev?{" "}
            <Text
              style={{ color: t.accent, fontWeight: "600" }}
              accessibilityRole="link"
              onPress={() => Linking.openURL(config.websiteUrl)}
            >
              Create an account
            </Text>
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
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
  back: { alignSelf: "flex-start", paddingVertical: spacing.sm, marginTop: spacing.sm },
  // Extra bottom padding sits the form slightly above true centre, which reads as centred.
  form: { flexGrow: 1, justifyContent: "center", paddingTop: spacing.lg, paddingBottom: spacing.xl * 3 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: { fontSize: 24, fontWeight: "900", fontStyle: "italic" },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginTop: spacing.lg, marginBottom: spacing.xs },
  fields: {
    marginTop: spacing.lg,
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
