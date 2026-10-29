import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useMarkAlertsRead } from "@/features/vehicles/hooks";
import type { Alert, AlertEvent } from "@/lib/api/schemas";
import { timeAgo } from "@/lib/format";
import { spacing, useTheme, type Theme } from "@/theme/theme";

type Icon = { name: SymbolViewProps["name"]; tone: (t: Theme) => { fg: string; bg: string } };

const accent = (t: Theme) => ({ fg: t.accent, bg: t.accentSoft });
const info = (t: Theme) => ({ fg: t.info, bg: t.infoSoft });
const violet = (t: Theme) => ({ fg: t.violet, bg: t.violetSoft });
const success = (t: Theme) => ({ fg: t.success, bg: t.successSoft });

const icons: Record<AlertEvent, Icon> = {
  BOOKING_RECEIVED: {
    name: { ios: "checkmark.circle", android: "check_circle", web: "check_circle" },
    tone: info,
  },
  PHOTOS_ADDED: { name: { ios: "photo", android: "image", web: "image" }, tone: violet },
  DOCUMENTS_READY: { name: { ios: "doc.text", android: "description", web: "description" }, tone: info },
  DEPARTURE_REMINDER: { name: { ios: "clock", android: "schedule", web: "schedule" }, tone: accent },
  NEW_STOCK: { name: { ios: "car", android: "directions_car", web: "directions_car" }, tone: info },
  CHAT_MESSAGE: { name: { ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }, tone: accent },
  LINK_REQUEST_APPROVED: { name: { ios: "link", android: "link", web: "link" }, tone: success },
  LINK_REQUEST_REJECTED: { name: { ios: "link", android: "link", web: "link" }, tone: accent },
  UNKNOWN: { name: { ios: "bell", android: "notifications", web: "notifications" }, tone: info },
};

// Alerts that point at a vehicle open its page (contract §7.2 "Suggested screen").
const opensVehicle: AlertEvent[] = [
  "BOOKING_RECEIVED",
  "PHOTOS_ADDED",
  "DOCUMENTS_READY",
  "DEPARTURE_REMINDER",
  "LINK_REQUEST_APPROVED",
];

/** Marks the alert read (fire and forget) and opens the screen it is about. */
export function useOpenAlert() {
  const markRead = useMarkAlertsRead();
  return (a: Alert, from: "home" | "alerts") => {
    if (!a.isRead) markRead.mutate({ ids: [a.id] });
    if (a.event === "CHAT_MESSAGE") router.push("/messages");
    else if (a.vehicleId && opensVehicle.includes(a.event)) {
      router.push({ pathname: "/vehicle/[id]", params: { id: a.vehicleId } });
    } else if (from === "home") router.push("/alerts");
  };
}

export function AlertRow({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  const t = useTheme();
  const icon = icons[alert.event];
  const tone = icon.tone(t);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${alert.isRead ? "" : "Unread. "}${alert.title}. ${alert.body}. ${timeAgo(alert.createdAt)}`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <SymbolView name={icon.name} size={18} tintColor={tone.fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleLine}>
          {alert.isRead ? null : <View style={[styles.unread, { backgroundColor: t.accent }]} />}
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {alert.title}
          </Text>
          <Text style={[styles.time, { color: t.textMuted }]}>{timeAgo(alert.createdAt)}</Text>
        </View>
        {/* Server text is plain text only (contract §7.1); never parsed or rendered as markup. */}
        <Text style={[styles.body, { color: t.textMuted }]} numberOfLines={2}>
          {alert.body}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, alignItems: "flex-start" },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  unread: { width: 7, height: 7, borderRadius: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: "600" },
  time: { fontSize: 12 },
  body: { fontSize: 13, lineHeight: 18 },
});
