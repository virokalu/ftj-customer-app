import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PortTrack, StatusChip, VehicleCover } from "@/components/vehicle-bits";
import { formatDate, journeyLine, journeyProgress, vehicleTitle } from "@/features/vehicles/status";
import type { VehicleSummary } from "@/lib/api/schemas";
import { radius, spacing, useTheme } from "@/theme/theme";

/** One vehicle in My vehicles (sheet 2): thumbnail, name, status, and the port-to-port track. */
export function VehicleRow({ vehicle }: { vehicle: VehicleSummary }) {
  const t = useTheme();
  const delivered = vehicle.status === "DELIVERED";
  const subtitle = [vehicle.year, vehicle.serial].filter(Boolean).join(" · ");
  // A delivered car has no journey left to show: say when it was bought instead (no amounts).
  const detail = delivered
    ? vehicle.purchaseDate
      ? `Bought ${formatDate(vehicle.purchaseDate)}`
      : null
    : journeyLine(vehicle);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/vehicle/[id]", params: { id: vehicle.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${vehicleTitle(vehicle)}, ${vehicle.serial}. ${detail ?? ""}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.background, borderColor: t.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.top}>
        <VehicleCover photoId={vehicle.coverPhotoId} style={styles.thumb} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {[vehicle.brand, vehicle.model, vehicle.grade].filter(Boolean).join(" ") || vehicle.serial}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: 12 }}>{subtitle}</Text>
          <View style={styles.statusLine}>
            <StatusChip status={vehicle.status} />
            {detail ? (
              <Text style={{ flex: 1, color: t.textMuted, fontSize: 12 }} numberOfLines={2}>
                {detail}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {delivered ? null : (
        <PortTrack
          from={vehicle.portOfLoading}
          to={vehicle.portOfDischarge ?? vehicle.destination}
          progress={journeyProgress(vehicle)}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  top: { flexDirection: "row", gap: spacing.md },
  thumb: { width: 92, height: 70, borderRadius: radius.md },
  title: { fontSize: 16, fontWeight: "700" },
  statusLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
});
