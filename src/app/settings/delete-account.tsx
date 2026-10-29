import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppText, Button } from "@/components/ui";
import { useDeleteAccount } from "@/features/account/hooks";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { radius, spacing, useTheme } from "@/theme/theme";

// In-app account deletion (App Store requirement; contract §2.8, guide §4).
export default function DeleteAccountScreen() {
  const t = useTheme();
  const { endDeletedSession } = useAuth();
  const remove = useDeleteAccount();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);

  async function finish(message: string) {
    // The access token already stopped working: wipe everything locally, no API calls.
    await endDeletedSession();
    Alert.alert(message);
  }

  function confirm() {
    if (!password || remove.isPending) return;
    Alert.alert(
      "Delete your account?",
      "This permanently removes your profile, chat history, alerts and notification settings. Your vehicle and shipping records are kept by CargoDev for business reasons and will no longer be linked to your name or email. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: submit },
      ],
    );
  }

  function submit() {
    setError(null);
    // Never retried automatically.
    remove.mutate(password, {
      onSuccess: () => void finish("Your account was deleted."),
      onError: (e) => {
        const status = e instanceof ApiError ? e.status : -1;
        if (status === 404) {
          void finish("Your account was deleted.");
          return;
        }
        if (status === 400) {
          // Wrong passwords count toward the 5-attempt sign-in lockout: warn early.
          const n = failures + 1;
          setFailures(n);
          setPassword("");
          setError(
            n >= 2
              ? "Incorrect password. After a few more tries your account is locked for 15 minutes."
              : "Incorrect password.",
          );
        } else if (status === 403 && e instanceof ApiError) {
          setError(e.message);
        } else if (status === 429) {
          setError("Too many attempts. Please wait a while and try again.");
        } else if (status === 0) {
          setError("No connection. Check your internet and try again.");
        } else {
          setError("Something went wrong on our side. Please try again.");
        }
      },
    });
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}
      >
        <View style={[styles.panel, { backgroundColor: t.surface }]}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>What happens</Text>
          {[
            "Your profile, chat history, alerts and notification settings are removed.",
            "You're signed out on every device.",
            "Your vehicle and shipping records stay with CargoDev, no longer linked to your name or email.",
            "You can create a new account with the same email later.",
          ].map((line) => (
            <View key={line} style={styles.bullet}>
              <Text style={{ color: t.textMuted, fontSize: 14 }}>•</Text>
              <Text style={{ flex: 1, color: t.textMuted, fontSize: 14, lineHeight: 20 }}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.label, { color: t.textMuted }]}>Current password</Text>
          <TextInput
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError(null);
            }}
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={confirm}
            accessibilityLabel="Current password"
            style={[
              styles.input,
              { color: t.text, backgroundColor: t.surface, borderColor: error ? t.danger : t.border },
            ]}
          />
          {error ? (
            <Text style={{ color: t.danger, fontSize: 13 }} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : (
            <AppText muted style={{ fontSize: 12 }}>
              We ask for your password to make sure it&apos;s you.
            </AppText>
          )}
        </View>

        {/* Destructive action: danger fill, never the brand crimson. */}
        <Button
          label="Delete account"
          variant="danger"
          onPress={confirm}
          loading={remove.isPending}
          disabled={!password}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  bullet: { flexDirection: "row", gap: spacing.sm },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
