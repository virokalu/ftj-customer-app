import { useState } from "react";
import { ActivityIndicator, ScrollView, Text } from "react-native";

import { ChoiceRow, SettingsGroup, SwitchRow } from "@/components/settings-ui";
import { AppText, Button, Centered } from "@/components/ui";
import { useNotificationPreferences, useUpdatePreferences } from "@/features/account/hooks";
import type { PreferenceChanges } from "@/lib/api/endpoints";
import type { PreferenceEvent } from "@/lib/api/schemas";
import { spacing, useTheme } from "@/theme/theme";

// NEW_STOCK is left out while stock is not built (guide §14); WhatsApp is never offered
// because it is stored but not sent (contract §3.2).
const events: { key: Exclude<PreferenceEvent, "NEW_STOCK">; label: string; detail: string }[] = [
  { key: "BOOKING_RECEIVED", label: "Booking received", detail: "Your vehicle is booked on a sailing" },
  {
    key: "DEPARTURE_REMINDER",
    label: "Departure reminder",
    detail: "A few days before your vehicle departs",
  },
  { key: "PHOTOS_ADDED", label: "New photos", detail: "Our yard team added photos" },
  { key: "DOCUMENTS_READY", label: "Documents ready", detail: "Export certificate or bill of lading" },
  { key: "CHAT_MESSAGE", label: "Messages", detail: "The team replied to you" },
];

export default function NotificationSettingsScreen() {
  const t = useTheme();
  const { data: prefs, isPending, isError, refetch } = useNotificationPreferences();
  const update = useUpdatePreferences();
  const [saveError, setSaveError] = useState(false);

  if (isPending) {
    return (
      <Centered>
        <ActivityIndicator color={t.accent} />
      </Centered>
    );
  }
  if (isError) {
    return (
      <Centered>
        <AppText muted>Couldn&apos;t load your notification settings.</AppText>
        <Button label="Try again" variant="secondary" onPress={() => void refetch()} />
      </Centered>
    );
  }

  const save = (changes: PreferenceChanges) => {
    setSaveError(false);
    update.mutate(changes, { onError: () => setSaveError(true) });
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl }}
    >
      {saveError ? (
        <Text style={{ color: t.danger, fontSize: 14 }}>
          Couldn&apos;t save that change. Please try again.
        </Text>
      ) : null}

      <SettingsGroup
        title="Tell me about"
        footer="Turning an update off means you won't get it at all, not even in Updates. Vehicle link results are always sent."
      >
        {events.map((e) => (
          <SwitchRow
            key={e.key}
            label={e.label}
            detail={e.detail}
            value={prefs.events[e.key]}
            onChange={(on) => save({ events: { [e.key]: on } })}
          />
        ))}
      </SettingsGroup>

      {prefs.events.DEPARTURE_REMINDER ? (
        <SettingsGroup>
          <ChoiceRow
            label="Remind me before departure"
            options={[
              { value: 3, label: "3 days" },
              { value: 7, label: "7 days" },
              { value: 14, label: "14 days" },
            ]}
            value={prefs.departureLeadDays}
            onChange={(days) => save({ departureLeadDays: days })}
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup
        title="How"
        footer="Turning a channel off keeps your updates in the app; you just won't get them that way."
      >
        <SwitchRow
          label="Push notifications"
          value={prefs.pushEnabled}
          onChange={(on) => save({ pushEnabled: on })}
        />
        <SwitchRow label="Email" value={prefs.emailEnabled} onChange={(on) => save({ emailEnabled: on })} />
      </SettingsGroup>
    </ScrollView>
  );
}
