import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { raised } from "@/components/ui";
import { PortTrack, StatusChip, VehicleCover } from "@/components/vehicle-bits";
import {
  formatDate,
  journeyLine,
  journeyProgress,
  journeyStage,
  statusLabel,
  vehicleName,
  vehicleSpec,
  vehicleTitle,
} from "@/features/vehicles/status";
import type { VehicleSummary } from "@/lib/api/schemas";
import { radius, spacing, useTheme } from "@/theme/theme";

// The two vehicle card designs for My vehicles (chosen in the card previews), with the same data:
// photo, make and model, year and grade, status, journey line, ports and progress.

const open = (id: string) => router.push({ pathname: "/vehicle/[id]", params: { id } });

// What the card says under the status: the journey, or when it was bought once delivered.
function stubText(v: VehicleSummary): string | null {
  if (v.status === "DELIVERED") return v.purchaseDate ? `Bought ${formatDate(v.purchaseDate)}` : null;
  return journeyLine(v);
}

const NOTCH = 16;

/**
 * One per row, "Boarding pass": photo on the left, the name and the route between the ports on
 * the right, then a dashed tear line with ticket notches and a stub with the status and journey.
 */
export function BoardingPassCard({ vehicle }: { vehicle: VehicleSummary }) {
  const t = useTheme();
  const delivered = vehicle.status === "DELIVERED";
  const stub = stubText(vehicle);
  return (
    <Pressable
      onPress={() => open(vehicle.id)}
      accessibilityRole="button"
      accessibilityLabel={`${vehicleTitle(vehicle)}. ${statusLabel[vehicle.status]}. ${stub ?? ""}`}
      style={({ pressed }) => [
        styles.pass,
        raised,
        { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.passTop}>
        <VehicleCover photoId={vehicle.coverPhotoId} style={styles.passPhoto} />
        <View style={styles.passInfo}>
          <View style={{ gap: 2 }}>
            <Text style={[styles.passName, { color: t.text }]} numberOfLines={1}>
              {vehicleName(vehicle)}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 12 }} numberOfLines={1}>
              {vehicleSpec(vehicle)}
            </Text>
          </View>
          {delivered ? null : (
            <PortTrack
              from={vehicle.portOfLoading}
              to={vehicle.portOfDischarge ?? vehicle.destination}
              progress={journeyProgress(vehicle)}
              stage={journeyStage(vehicle)}
            />
          )}
        </View>
      </View>

      {/* Tear line: dashes between two half-circle notches cut out of the card edges. */}
      <View style={styles.tear}>
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: t.canvas }]} />
        <View style={[styles.dashes, { borderColor: t.border }]} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: t.canvas }]} />
      </View>

      <View style={styles.stub}>
        <StatusChip status={vehicle.status} />
        {stub ? (
          <Text style={[styles.stubText, { color: t.textMuted }]} numberOfLines={1}>
            {stub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Two per row, "Poster tile": the photo fills the card, a dark fade at the bottom carries the name
 * and details in white, the status sits top-left, and a thin crimson line along the bottom edge
 * shows how far along the journey the car is.
 */
export function PosterTile({ vehicle, width }: { vehicle: VehicleSummary; width: number }) {
  const t = useTheme();
  const height = Math.round(width * 1.3);
  const progress = vehicle.status === "DELIVERED" ? 1 : journeyProgress(vehicle);
  const stub = stubText(vehicle);
  return (
    <Pressable
      onPress={() => open(vehicle.id)}
      accessibilityRole="button"
      accessibilityLabel={`${vehicleTitle(vehicle)}. ${statusLabel[vehicle.status]}. ${stub ?? ""}`}
      style={({ pressed }) => [
        styles.poster,
        raised,
        { width, height, backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.posterClip}>
        <VehicleCover photoId={vehicle.coverPhotoId} style={StyleSheet.absoluteFill} />
        {/* Dark fade so the white text stays readable on any photo (or the placeholder). */}
        <Svg style={styles.fade} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.78} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#fade)" />
        </Svg>
        <View style={styles.posterChip}>
          <StatusChip status={vehicle.status} />
        </View>
        <View style={styles.posterText}>
          <Text style={styles.posterName} numberOfLines={2}>
            {vehicleName(vehicle)}
          </Text>
          <Text style={styles.posterSub} numberOfLines={1}>
            {vehicleSpec(vehicle)}
          </Text>
          {stub ? (
            <Text style={styles.posterSub} numberOfLines={1}>
              {stub}
            </Text>
          ) : null}
        </View>
        <View style={styles.posterTrack}>
          <View
            style={[
              styles.posterFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: t.accent },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pass: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  passTop: { flexDirection: "row", gap: spacing.md, padding: spacing.md, paddingBottom: spacing.sm + 2 },
  passPhoto: { width: 104, height: 84, borderRadius: radius.md },
  passInfo: { flex: 1, justifyContent: "space-between", gap: spacing.sm },
  passName: { fontSize: 16, fontWeight: "700" },
  tear: { height: NOTCH, justifyContent: "center" },
  dashes: { marginHorizontal: NOTCH / 2 + 6, borderTopWidth: 1, borderStyle: "dashed" },
  notch: {
    position: "absolute",
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  stub: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  stubText: { flexShrink: 1, fontSize: 13, fontWeight: "600", textAlign: "right" },
  poster: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  posterClip: { flex: 1, borderRadius: radius.lg, overflow: "hidden" },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  posterChip: { position: "absolute", top: spacing.sm, left: spacing.sm },
  posterText: {
    position: "absolute",
    left: spacing.sm + 2,
    right: spacing.sm + 2,
    bottom: spacing.md,
    gap: 2,
  },
  posterName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  posterSub: { color: "rgba(255,255,255,0.85)", fontSize: 11.5, fontWeight: "500" },
  posterTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  posterFill: { height: 3 },
});
