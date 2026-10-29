import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Centered, raised } from "@/components/ui";
import { PhotoViewer } from "@/components/photo-viewer";
import { StatusChip } from "@/components/vehicle-bits";
import {
  Gallery,
  OverviewTab,
  PhotosTab,
  Segmented,
  StatusCard,
  TimelineTab,
  type VehicleTab,
} from "@/components/vehicle-detail";
import { usePhotos, useTimeline, useVehicle, useVehicleDocuments } from "@/features/vehicles/hooks";
import { vehicleTitle } from "@/features/vehicles/status";
import { ApiError } from "@/lib/api/client";
import { radius, spacing, useTheme } from "@/theme/theme";

// Vehicle page (sheet 3): gallery, status card, Overview / Timeline / Photos, and a sticky
// "Ask about this car". Data: /vehicles/:id, /timeline, /photos, /documents?vehicleId=.
export default function VehicleScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicle = useVehicle(id);
  const timeline = useTimeline(id);
  const photos = usePhotos(id);
  const documents = useVehicleDocuments(id);
  const [tab, setTab] = useState<VehicleTab>("overview");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const refreshing =
    vehicle.isRefetching || timeline.isRefetching || photos.isRefetching || documents.isRefetching;
  const refresh = () => {
    void vehicle.refetch();
    void timeline.refetch();
    void photos.refetch();
    void documents.refetch();
  };

  const back = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      style={[
        styles.back,
        raised,
        { top: insets.top + spacing.sm, backgroundColor: t.card, borderColor: t.border },
      ]}
    >
      <SymbolView
        name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
        size={16}
        tintColor={t.text}
      />
    </Pressable>
  );

  if (vehicle.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: t.canvas }}>
        <Centered>
          <ActivityIndicator color={t.accent} />
        </Centered>
        {back}
      </View>
    );
  }

  if (vehicle.isError) {
    // 404 covers "not released yet", "unlinked" and "gone": the API never says which (contract §4).
    const notFound = vehicle.error instanceof ApiError && vehicle.error.status === 404;
    return (
      <View style={{ flex: 1, backgroundColor: t.canvas }}>
        <Centered>
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, alignItems: "center" }}>
            <AppText style={{ fontSize: 18, fontWeight: "700", textAlign: "center" }}>
              {notFound ? "Your vehicle is being prepared" : "Couldn't load this vehicle"}
            </AppText>
            <AppText muted style={{ textAlign: "center" }}>
              {notFound
                ? "It isn't available to view yet, or is no longer available. We'll let you know when it's ready."
                : "Check your connection and try again."}
            </AppText>
            {notFound ? (
              <Button
                label="Go to my vehicles"
                variant="secondary"
                onPress={() => router.replace("/vehicles")}
              />
            ) : (
              <Button label="Try again" variant="secondary" onPress={refresh} />
            )}
          </View>
        </Centered>
        {back}
      </View>
    );
  }

  const v = vehicle.data;
  const subtitle = [v.year, v.serial, v.chassisNo].filter(Boolean).join(" · ");

  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.accent} />}
      >
        <View style={{ paddingTop: insets.top }}>
          <Gallery photos={photos.data ?? []} onOpen={setViewerIndex} />
        </View>

        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <View style={{ gap: 4 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
                {vehicleTitle(v)}
              </Text>
              <StatusChip status={v.status} />
            </View>
            <Text style={{ color: t.textMuted, fontSize: 13 }}>{subtitle}</Text>
          </View>

          <StatusCard vehicle={v} steps={timeline.data} onDetails={() => setTab("timeline")} />

          <Segmented value={tab} onChange={setTab} />

          {tab === "overview" ? (
            <OverviewTab vehicle={v} documents={documents.data} documentsLoading={documents.isPending} />
          ) : tab === "timeline" ? (
            <TimelineTab vehicle={v} steps={timeline.data} />
          ) : (
            <PhotosTab photos={photos.data} loading={photos.isPending} onOpen={setViewerIndex} />
          )}
        </View>
      </ScrollView>

      {back}

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + spacing.sm,
            backgroundColor: t.card,
            borderTopColor: t.border,
          },
        ]}
      >
        {/* Chat is not built yet: this opens Messages. Later it opens (or starts) the conversation
            for this vehicle (guide §12). No phone button: the API has no agent phone number. */}
        <Pressable
          onPress={() => router.push("/messages")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.ask, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <SymbolView
            name={{ ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }}
            size={16}
            tintColor={t.onAccent}
          />
          <Text style={{ color: t.onAccent, fontSize: 16, fontWeight: "700" }}>Ask about this car</Text>
        </Pressable>
      </View>

      <PhotoViewer
        photos={photos.data ?? []}
        startIndex={viewerIndex}
        serial={v.serial}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    position: "absolute",
    left: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { flex: 1, fontSize: 24, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ask: {
    minHeight: 50,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
});
