import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppText, Button } from "@/components/ui";
import { useLinkVehicle } from "@/features/vehicles/hooks";
import { ApiError } from "@/lib/api/client";
import { radius, spacing, useTheme } from "@/theme/theme";

const SERIAL = /^(FC|FL)\d{1,9}$/;

// Link a vehicle (contract §6). The API answers 202 for every serial, so the app never says
// whether a vehicle exists: one neutral confirmation, the result comes later as an alert.
export default function LinkVehicleScreen() {
  const t = useTheme();
  const [serial, setSerial] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = useLinkVehicle();

  const value = serial.trim().toUpperCase();
  const valid = SERIAL.test(value);

  function submit() {
    if (!valid || link.isPending) return;
    setError(null);
    // Never retried automatically: a request may have been stored even if the reply was lost.
    link.mutate(value, {
      onSuccess: () => {
        setSent(true);
        setSerial("");
      },
      onError: (e) => {
        const status = e instanceof ApiError ? e.status : -1;
        setError(
          status === 400
            ? "Enter a serial number such as FC1024."
            : status === 429
              ? "You've sent several requests. Please try again later."
              : status === 0
                ? "No connection. Check your internet and try again."
                : "Something went wrong. Please try again.",
        );
      },
    });
  }

  if (sent) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <View style={[styles.icon, { backgroundColor: t.successSoft }]}>
          <SymbolView
            name={{ ios: "checkmark", android: "check", web: "check" }}
            size={26}
            tintColor={t.success}
          />
        </View>
        <Text style={[styles.heading, { color: t.text }]}>Request sent</Text>
        <AppText muted style={{ textAlign: "center", lineHeight: 22 }}>
          Thanks. We&apos;ll check and let you know in your updates.
        </AppText>
        <View style={{ alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.md }}>
          <Button label="Done" onPress={() => router.back()} />
          <Button label="Link another vehicle" variant="secondary" onPress={() => setSent(false)} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        <AppText muted style={{ lineHeight: 22 }}>
          Bought a vehicle that isn&apos;t in your account yet? Enter its serial number and our team will link
          it for you.
        </AppText>
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.label, { color: t.textMuted }]}>Serial number</Text>
          <TextInput
            value={serial}
            onChangeText={(s) => {
              setSerial(s);
              setError(null);
            }}
            placeholder="FC1024"
            placeholderTextColor={t.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={11}
            returnKeyType="send"
            onSubmitEditing={submit}
            accessibilityLabel="Serial number"
            style={[
              styles.input,
              { color: t.text, backgroundColor: t.surface, borderColor: error ? t.danger : t.border },
            ]}
          />
          <Text style={{ color: error ? t.danger : t.textMuted, fontSize: 13 }}>
            {error ?? "Starts with FC or FL, for example FC1024."}
          </Text>
        </View>
        <Button label="Send request" onPress={submit} loading={link.isPending} disabled={!valid} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 22, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
