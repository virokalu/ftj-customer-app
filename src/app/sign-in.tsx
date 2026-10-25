import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, TextInput, View } from "react-native";

import { AppText, Button, Screen, Title } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { config } from "@/lib/config";
import { radius, spacing, useTheme } from "@/theme/theme";

// Sign-in only. Accounts are created on the FTJ website (decision, 19 Oct 2026).
export default function SignInScreen() {
  const t = useTheme();
  const { signIn } = useAuth();
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

  const inputStyle = [styles.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
        <Title>Sign in</Title>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={t.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          style={inputStyle}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={t.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={() => canSubmit && onSubmit()}
          style={inputStyle}
        />
        <AppText muted onPress={() => setShowPassword((v) => !v)}>
          {showPassword ? "Hide password" : "Show password"}
        </AppText>

        {error ? <AppText style={{ color: t.danger }}>{error}</AppText> : null}

        <Button label="Sign in" onPress={onSubmit} loading={submitting} />

        <View style={{ marginTop: spacing.md }}>
          <AppText muted>
            New customer? Create your account on the FTJ website, then sign in here.
          </AppText>
          <AppText style={{ color: t.accent, marginTop: spacing.xs }} onPress={() => Linking.openURL(config.websiteUrl)}>
            Open FTJ website
          </AppText>
        </View>
        {/* TODO: forgot-password sheet (needs the reset endpoints) */}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
