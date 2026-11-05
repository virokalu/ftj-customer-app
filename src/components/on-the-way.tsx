import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import { GlassLayer } from "@/components/glass";
import { raised } from "@/components/ui";
import { PHOTO_GLASS_TINT, PortTrack, StatusChip, VehicleCover } from "@/components/vehicle-bits";
import {
  journeyLine,
  journeyProgress,
  journeyStage,
  vehicleName,
  vehicleSpec,
} from "@/features/vehicles/status";
import type { VehicleSummary } from "@/lib/api/schemas";
import { radius, spacing, useTheme } from "@/theme/theme";

/**
 * Swipeable "On the way" cards (Home, sheet 2), one full-width card per page: a swipe snaps to
 * the next car, with nothing of it showing at the edge. The "1 / 7" chip on the photo and the
 * dots below say there are more. Full-bleed: it manages its own side padding.
 */
export function OnTheWayCarousel({ vehicles }: { vehicles: VehicleSummary[] }) {
  const { width } = useWindowDimensions();
  const cardWidth = width - spacing.md * 2;
  const interval = cardWidth + spacing.md;
  // The scroll position, tracked on the UI thread every frame, so the dots follow the finger
  // instead of waiting for the swipe to come to rest.
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });

  return (
    <View style={{ gap: spacing.sm }}>
      <Animated.FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <OnTheWayCard
            vehicle={item}
            width={cardWidth}
            position={vehicles.length > 1 ? `${index + 1} / ${vehicles.length}` : null}
          />
        )}
      />
      {vehicles.length > 1 ? <Dots count={vehicles.length} scrollX={scrollX} interval={interval} /> : null}
    </View>
  );
}

function OnTheWayCard({
  vehicle,
  width,
  position,
}: {
  vehicle: VehicleSummary;
  width: number;
  /** "1 / 7": which card this is, on the photo. None when there is only one. */
  position: string | null;
}) {
  const t = useTheme();
  const subtitle = [vehicleName(vehicle), vehicleSpec(vehicle)].filter(Boolean).join(" · ");
  return (
    // router.push, not <Link asChild>: Link's Slot drops a Pressable's style function, which
    // collapsed the card to its text width.
    <Pressable
      onPress={() => router.push({ pathname: "/vehicle/[id]", params: { id: vehicle.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${journeyLine(vehicle)}. ${subtitle}${position ? `. ${position.replace(" / ", " of ")}` : ""}`}
      style={({ pressed }) => [
        styles.card,
        raised,
        { width, backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* Clips the photo to the rounded corners; on the outer card it would also clip the shadow. */}
      <View style={styles.clip}>
        <VehicleCover photoId={vehicle.coverPhotoId} style={styles.cover} />
        <View style={styles.chip}>
          <StatusChip status={vehicle.status} onPhoto />
        </View>
        {position ? (
          // Dark photo glass, like the status chip and the vehicle page's photo count.
          <View style={styles.position}>
            <GlassLayer
              radius={999}
              scheme="dark"
              tint={PHOTO_GLASS_TINT}
              fallback={<View style={[StyleSheet.absoluteFill, styles.positionFallback]} />}
            />
            <Text style={styles.positionText}>{position}</Text>
          </View>
        ) : null}
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
            stage={journeyStage(vehicle)}
          />
        </View>
      </View>
    </Pressable>
  );
}

// Page dots that follow the swipe live: each dot widens into the crimson pill and takes its
// colour by how close the scroll is to its card, so the pill stretches across from one dot to
// the next while dragging. Driven by the finger, not an animation, so it is the same under
// Reduce Motion.
function Dots({
  count,
  scrollX,
  interval,
}: {
  count: number;
  scrollX: SharedValue<number>;
  interval: number;
}) {
  return (
    <View style={styles.dots} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} interval={interval} />
      ))}
    </View>
  );
}

function Dot({
  index,
  scrollX,
  interval,
}: {
  index: number;
  scrollX: SharedValue<number>;
  interval: number;
}) {
  const t = useTheme();
  const style = useAnimatedStyle(() => {
    // 1 when this dot's card is centred, falling to 0 one card away.
    const near = Math.max(0, 1 - Math.abs(scrollX.value / interval - index));
    return {
      width: DOT + (PILL - DOT) * near,
      backgroundColor: interpolateColor(near, [0, 1], [t.border, t.accent]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const DOT = 6;
const PILL = 16;

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  clip: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: "hidden" },
  // Taller than before now that the card has the full width.
  cover: { height: 180 },
  chip: { position: "absolute", top: spacing.sm, left: spacing.sm },
  position: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  positionFallback: { borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)" },
  positionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  body: { padding: spacing.md, gap: 2 },
  headline: { fontSize: 19, fontWeight: "700" },
  subtitle: { fontSize: 13 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5 },
  dot: { height: DOT, borderRadius: DOT / 2 },
});
