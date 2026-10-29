import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button, Centered } from "@/components/ui";
import { useUpdateMe } from "@/features/account/hooks";
import { useMe } from "@/features/vehicles/hooks";
import { ApiError } from "@/lib/api/client";
import type { MeChanges } from "@/lib/api/endpoints";
import type { Me } from "@/lib/api/schemas";
import { radius, spacing, useTheme } from "@/theme/theme";

type Field = "name" | "phone" | "companyName" | "country" | "destinationPort";

// Limits from contract §3.1. Name cannot be empty; the others clear to null when emptied.
const fields: { key: Field; label: string; max: number; hint?: string; keyboard?: "phone-pad" }[] = [
  { key: "name", label: "Full name", max: 150 },
  { key: "phone", label: "Phone", max: 30, keyboard: "phone-pad" },
  { key: "companyName", label: "Company", max: 150 },
  { key: "country", label: "Country", max: 100 },
  { key: "destinationPort", label: "Destination port", max: 100, hint: "Where your vehicles are shipped to" },
];

const toForm = (me: Me): Record<Field, string> => ({
  name: me.name,
  phone: me.phone ?? "",
  companyName: me.companyName ?? "",
  country: me.country ?? "",
  destinationPort: me.destinationPort ?? "",
});

export default function PersonalDetailsScreen() {
  const t = useTheme();
  const { data: me } = useMe();
  if (!me) {
    return (
      <Centered>
        <ActivityIndicator color={t.accent} />
      </Centered>
    );
  }
  // Mounted only once the profile is loaded, so the form starts from it (no syncing effect).
  return <DetailsForm me={me} />;
}

function DetailsForm({ me }: { me: Me }) {
  const t = useTheme();
  const update = useUpdateMe();
  const [form, setForm] = useState(() => toForm(me));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Only changed fields are sent: an unchanged PATCH is a 400, and a full one would
  // overwrite edits made on another device.
  const original = toForm(me);
  const changes: MeChanges = {};
  for (const { key } of fields) {
    const value = form[key].trim();
    if (value === original[key].trim()) continue;
    if (key === "name") changes.name = value;
    else changes[key] = value === "" ? null : value;
  }
  const dirty = Object.keys(changes).length > 0;

  function save() {
    if (!form.name.trim()) {
      setErrors({ name: "Enter your name." });
      return;
    }
    setErrors({});
    setFormError(null);
    update.mutate(changes, {
      onSuccess: () => router.back(),
      onError: (e) => {
        if (e instanceof ApiError && e.status === 400 && e.fieldErrors) {
          // Server texts are English zod messages: show our own copy per field instead.
          const next: Partial<Record<Field, string>> = {};
          for (const f of fields)
            if (e.fieldErrors[f.key]) next[f.key] = `Check this field (up to ${f.max} characters).`;
          setErrors(next);
          if (Object.keys(next).length === 0) setFormError("Please check your details and try again.");
        } else {
          setFormError(
            e instanceof ApiError && e.status === 0
              ? "No connection. Your changes are kept; try again when you're online."
              : "Couldn't save your details. Please try again.",
          );
        }
      },
    });
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.canvas }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.label, { color: t.textMuted }]}>Email</Text>
          <View
            style={[styles.input, styles.readOnly, { backgroundColor: t.control, borderColor: t.border }]}
          >
            <Text style={{ color: t.textMuted, fontSize: 16 }}>{me.email ?? "-"}</Text>
          </View>
          <Text style={{ color: t.textMuted, fontSize: 12 }}>
            Your email can&apos;t be changed in the app.
          </Text>
        </View>

        {fields.map((f) => (
          <View key={f.key} style={{ gap: spacing.xs }}>
            <Text style={[styles.label, { color: t.textMuted }]}>{f.label}</Text>
            <TextInput
              value={form[f.key]}
              onChangeText={(v) => {
                setForm({ ...form, [f.key]: v });
                setErrors({ ...errors, [f.key]: undefined });
              }}
              maxLength={f.max}
              keyboardType={f.keyboard ?? "default"}
              autoCapitalize={f.key === "phone" ? "none" : "words"}
              textContentType={f.key === "name" ? "name" : f.key === "phone" ? "telephoneNumber" : "none"}
              accessibilityLabel={f.label}
              style={[
                styles.input,
                {
                  color: t.text,
                  backgroundColor: t.card,
                  borderColor: errors[f.key] ? t.danger : t.border,
                },
              ]}
            />
            {errors[f.key] ? (
              <Text style={{ color: t.danger, fontSize: 12 }}>{errors[f.key]}</Text>
            ) : f.hint ? (
              <Text style={{ color: t.textMuted, fontSize: 12 }}>{f.hint}</Text>
            ) : null}
          </View>
        ))}

        {formError ? <Text style={{ color: t.danger, fontSize: 14 }}>{formError}</Text> : null}
        <Button label="Save changes" onPress={save} loading={update.isPending} disabled={!dirty} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  readOnly: { justifyContent: "center" },
});
