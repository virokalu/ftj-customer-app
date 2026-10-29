import { Stack } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AlertRow, useOpenAlert } from "@/components/alert-row";
import { AppText, Button, Centered } from "@/components/ui";
import { useAlerts, useMarkAlertsRead } from "@/features/vehicles/hooks";
import { radius, spacing, useTheme } from "@/theme/theme";

// Alerts list (opened from the bell on Home). Grouped by UTC day as the API sends them.
// TODO: load further pages (merge days by date) once accounts have more than 20 alerts.
export default function AlertsScreen() {
  const t = useTheme();
  const { data, isPending, isError, refetch, isRefetching } = useAlerts();
  const markRead = useMarkAlertsRead();
  const openAlert = useOpenAlert();

  const sections = data?.days.map((d) => ({ title: dayLabel(d.date), data: d.alerts })) ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread > 0 ? (
              <Pressable
                onPress={() => markRead.mutate({ all: true })}
                disabled={markRead.isPending}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={{ color: t.accentText, fontSize: 16 }}>Mark all read</Text>
              </Pressable>
            ) : null,
        }}
      />
      {isPending ? (
        <Centered>
          <ActivityIndicator color={t.accent} />
        </Centered>
      ) : isError ? (
        <Centered>
          <AppText muted>Couldn&apos;t load your updates.</AppText>
          <Button label="Try again" variant="secondary" onPress={() => void refetch()} />
        </Centered>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(a) => a.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.day, { color: t.textMuted }]}>{section.title}</Text>
          )}
          // Each day is one card: the first and last rows of a section carry the rounded corners.
          renderItem={({ item, index, section }) => (
            <View
              style={[
                styles.cardRow,
                { backgroundColor: t.card, borderColor: t.border },
                index === 0 && styles.cardTop,
                index === section.data.length - 1 && styles.cardBottom,
              ]}
            >
              <AlertRow alert={item} onPress={() => openAlert(item, "alerts")} />
            </View>
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.cardRow, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 52 }} />
            </View>
          )}
          ListEmptyComponent={
            <AppText muted style={{ marginTop: spacing.xl, textAlign: "center" }}>
              No updates yet. We&apos;ll let you know when something changes.
            </AppText>
          }
        />
      )}
    </View>
  );
}

// "Today", "Yesterday", else "Mon 26 Oct". `date` is a UTC calendar day (YYYY-MM-DD).
function dayLabel(date: string, now = new Date()): string {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  const yesterday = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const styles = StyleSheet.create({
  cardRow: {
    paddingHorizontal: spacing.md,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  cardTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  cardBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  day: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
});
