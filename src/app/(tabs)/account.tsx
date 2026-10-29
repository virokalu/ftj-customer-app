import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChoiceRow, SettingsGroup, SettingsRow } from "@/components/settings-ui";
import { Button, raised } from "@/components/ui";
import { fromServerTheme, setAppearance } from "@/features/account/appearance";
import { useUpdateMe } from "@/features/account/hooks";
import { useAuth } from "@/features/auth/auth-context";
import { useMe } from "@/features/vehicles/hooks";
import { initials } from "@/lib/format";
import { spacing, useTheme, type AppearancePreference } from "@/theme/theme";

const appearanceOptions: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// Account: profile, settings, help, sign out and the in-app account deletion Apple requires.
// Fields follow guide §14 / contract §3.1 (design sheet 5 is not exported yet).
export default function AccountScreen() {
  const t = useTheme();
  const { signOut } = useAuth();
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const [signingOut, setSigningOut] = useState(false);
  // The tapped choice shows at once; the server value takes over again once saved.
  const [pendingAppearance, setPendingAppearance] = useState<AppearancePreference | null>(null);

  const appearance = pendingAppearance ?? fromServerTheme(me?.theme ?? null);

  function changeAppearance(next: AppearancePreference) {
    if (next === appearance) return;
    const previous = appearance;
    // Applied at once on this device; saved to the account in the background.
    setPendingAppearance(next);
    void setAppearance(next);
    updateMe.mutate(
      { theme: next },
      {
        onSettled: () => setPendingAppearance(null),
        onError: () => {
          void setAppearance(previous);
          Alert.alert("Couldn't save Appearance", "Please try again.");
        },
      },
    );
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in at any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          setSigningOut(true);
          void signOut();
        },
      },
    ]);
  }

  const memberSince = me
    ? new Date(me.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.canvas }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl }}>
        <Text style={[styles.title, { color: t.text }]}>Account</Text>

        <View style={[styles.profile, raised, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={[styles.avatar, { backgroundColor: t.accent }]}>
            <Text style={{ color: t.onAccent, fontSize: 20, fontWeight: "700" }}>
              {me ? initials(me.name) : ""}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: "700" }} numberOfLines={1}>
              {me?.name ?? " "}
            </Text>
            {me?.email ? (
              <Text style={{ color: t.textMuted, fontSize: 14 }} numberOfLines={1}>
                {me.email}
              </Text>
            ) : null}
            <Text style={{ color: t.textMuted, fontSize: 12 }} numberOfLines={1}>
              {[me?.companyName, memberSince ? `Member since ${memberSince}` : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>

        <SettingsGroup title="Your account">
          <SettingsRow
            icon={{ ios: "person", android: "person", web: "person" }}
            label="Personal details"
            onPress={() => router.push("/settings/details")}
          />
          <SettingsRow
            icon={{ ios: "mappin.and.ellipse", android: "place", web: "place" }}
            label="Destination port"
            value={me?.destinationPort ?? "Not set"}
            onPress={() => router.push("/settings/details")}
          />
          <SettingsRow
            icon={{ ios: "bell", android: "notifications", web: "notifications" }}
            label="Notifications"
            onPress={() => router.push("/settings/notifications")}
          />
          <SettingsRow
            icon={{ ios: "link", android: "link", web: "link" }}
            label="Link a vehicle"
            onPress={() => router.push("/link-vehicle")}
          />
        </SettingsGroup>

        <SettingsGroup
          title="Preferences"
          footer="Auto follows your phone's light or dark setting. Your choice is saved to your account."
        >
          <ChoiceRow
            label="Appearance"
            options={appearanceOptions}
            value={appearance}
            onChange={changeAppearance}
          />
          {/* Languages at launch are not decided yet (guide open question 1): English only. */}
          <SettingsRow
            icon={{ ios: "globe", android: "language", web: "language" }}
            label="Language"
            value="English"
          />
        </SettingsGroup>

        <SettingsGroup title="Help">
          <SettingsRow
            icon={{ ios: "questionmark.circle", android: "help", web: "help" }}
            label="Help & FAQs"
            onPress={() => router.push("/settings/help")}
          />
          <SettingsRow
            icon={{ ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }}
            label="Message the team"
            onPress={() => router.push("/messages")}
          />
        </SettingsGroup>

        <Button label="Sign out" variant="secondary" loading={signingOut} onPress={confirmSignOut} />

        <SettingsGroup footer="Permanently removes your profile, chat history, alerts and notification settings.">
          <SettingsRow
            label="Delete account"
            destructive
            onPress={() => router.push("/settings/delete-account")}
          />
        </SettingsGroup>

        <Text style={[styles.version, { color: t.textMuted }]}>
          FTJ Exports {Constants.expoConfig?.version ?? ""}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  version: { fontSize: 12, textAlign: "center" },
});
