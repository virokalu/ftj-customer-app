import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useMarkAlertsRead, useVehiclesById } from "@/features/vehicles/hooks";
import { daysUntil, vehicleTitle } from "@/features/vehicles/status";
import type { Alert, AlertEvent, VehicleSummary } from "@/lib/api/schemas";
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
  return (a: Alert, from: "home" | "updates") => {
    if (!a.isRead) markRead.mutate({ ids: [a.id] });
    if (a.event === "CHAT_MESSAGE") router.push("/messages");
    else if (a.vehicleId && opensVehicle.includes(a.event)) {
      router.push({ pathname: "/vehicle/[id]", params: { id: a.vehicleId } });
    } else if (from === "home") router.push("/updates");
  };
}

// The app's own wording per alert type (contract §7.1-7.2 allows localising by `event`; the body
// is never parsed). The server's texts name cars by their internal FTJ serial (FC90090); here the
// car is named by year, make and model instead, and day counts come from the car's own dates.
function alertCopy(
  a: Alert,
  vehicle: VehicleSummary | undefined,
  now = new Date(),
): { title: string; body: string } {
  const car = vehicle ? `your ${vehicleTitle(vehicle)}` : "your vehicle";
  const Car = car.charAt(0).toUpperCase() + car.slice(1);
  switch (a.event) {
    case "BOOKING_RECEIVED":
      return { title: "Booking received", body: `${Car} is booked on a sailing.` };
    case "PHOTOS_ADDED":
      return { title: "New photos", body: `New photos of ${car} are ready to see.` };
    case "DOCUMENTS_READY":
      return { title: "Document ready", body: `A shipping document for ${car} is ready.` };
    case "DEPARTURE_REMINDER": {
      const days = vehicle?.etd ? daysUntil(vehicle.etd, now) : null;
      const when =
        days === null || days < 0
          ? "soon"
          : days === 0
            ? "today"
            : days === 1
              ? "tomorrow"
              : `in ${days} days`;
      return { title: "Departing soon", body: `${Car} departs ${when}.` };
    }
    case "CHAT_MESSAGE":
      return { title: "New message", body: "You have a new message from the team." };
    case "LINK_REQUEST_APPROVED":
      return { title: "Vehicle linked", body: `${Car} was added to your account.` };
    case "LINK_REQUEST_REJECTED":
      return {
        title: "Vehicle request",
        body: "We couldn't link the vehicle you asked about. Check your messages for details.",
      };
    default:
      // NEW_STOCK names stock by make, model and year (no serial); unknown types: server text.
      return { title: a.title, body: a.body };
  }
}

export function AlertRow({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  const t = useTheme();
  const icon = icons[alert.event];
  const tone = icon.tone(t);
  const vehicles = useVehiclesById();
  const vehicle = alert.vehicleId ? vehicles.data?.get(alert.vehicleId) : undefined;
  const { title, body } = alertCopy(alert, vehicle);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${alert.isRead ? "" : "Unread. "}${title}. ${body}. ${timeAgo(alert.createdAt)}`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <SymbolView name={icon.name} size={18} tintColor={tone.fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleLine}>
          {alert.isRead ? null : <View style={[styles.unread, { backgroundColor: t.accent }]} />}
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.time, { color: t.textMuted }]}>{timeAgo(alert.createdAt)}</Text>
        </View>
        <Text style={[styles.body, { color: t.textMuted }]} numberOfLines={2}>
          {body}
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
