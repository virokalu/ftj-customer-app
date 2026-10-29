import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { PortTrack, StatusChip, VehicleCover } from "@/components/vehicle-bits";
import { journeyLine, journeyProgress, vehicleTitle } from "@/features/vehicles/status";
import type { VehicleSummary } from "@/lib/api/schemas";
import { radius, spacing, useTheme } from "@/theme/theme";

// How much of the next card shows at the right edge, hinting that the row swipes.
const PEEK = 28;

/** Swipeable "On the way" cards (Home, sheet 2). Full-bleed: it manages its own side padding. */
export function OnTheWayCarousel({ vehicles }: { vehicles: VehicleSummary[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const cardWidth = width - spacing.md * 2 - (vehicles.length > 1 ? PEEK : 0);
  const interval = cardWidth + spacing.md;

  return (
    <View style={{ gap: spacing.sm }}>
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / interval))}
        renderItem={({ item }) => <OnTheWayCard vehicle={item} width={cardWidth} />}
      />
      {vehicles.length > 1 ? <Dots count={vehicles.length} active={index} /> : null}
    </View>
  );
}

function OnTheWayCard({ vehicle, width }: { vehicle: VehicleSummary; width: number }) {
  const t = useTheme();
  const subtitle = [vehicleTitle(vehicle), vehicle.serial].join(" · ");
  return (
    // router.push, not <Link asChild>: Link's Slot drops a Pressable's style function, which
    // collapsed the card to its text width.
    <Pressable
      onPress={() => router.push({ pathname: "/vehicle/[id]", params: { id: vehicle.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${journeyLine(vehicle)}. ${subtitle}`}
      style={({ pressed }) => [
        styles.card,
        { width, backgroundColor: t.background, borderColor: t.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View>
        <VehicleCover photoId={vehicle.coverPhotoId} style={styles.cover} />
        <View style={styles.chip}>
          <StatusChip status={vehicle.status} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.headline, { color: t.text }]} numberOfLines={1}>
          {journeyLine(vehicle)}
        </Text>
        <Text style={[styles.subtitle, { color: t.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={{ marginTop: spacing.sm }}>
          <PortTrack
            from={vehicle.portOfLoading}
            to={vehicle.portOfDischarge ?? vehicle.destination}
            progress={journeyProgress(vehicle)}
          />
        </View>
      </View>
    </Pressable>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  const t = useTheme();
  return (
    <View style={styles.dots} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active ? { width: 16, backgroundColor: t.accent } : { backgroundColor: t.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  cover: { height: 150 },
  chip: { position: "absolute", top: spacing.sm, left: spacing.sm },
  body: { padding: spacing.md, gap: 2 },
  headline: { fontSize: 19, fontWeight: "700" },
  subtitle: { fontSize: 13 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
