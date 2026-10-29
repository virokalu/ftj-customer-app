import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { statusLabel, statusTone } from "@/features/vehicles/status";
import { freshAccessToken } from "@/lib/api/client";
import type { VehicleStatus } from "@/lib/api/schemas";
import { config } from "@/lib/config";
import { spacing, useTheme } from "@/theme/theme";

// Photos are fetched by id from the API with the Bearer token (contract §5); there is no
// public URL. Cached by photo id, so a refreshed token does not re-download anything.
function useAccessToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    // Image requests cannot await a 401-and-retry, so make sure the token has time left.
    void freshAccessToken().then((value) => {
      if (live) setToken(value);
    });
    return () => {
      live = false;
    };
  }, []);
  return token;
}

export function VehicleCover({
  photoId,
  size = "thumb",
  style,
}: {
  photoId: string | null;
  size?: "thumb" | "full";
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const token = useAccessToken();
  const [failed, setFailed] = useState(false);
  const showPhoto = photoId && token && !failed && !config.useMocks;

  return (
    <View style={[{ backgroundColor: t.canvas, overflow: "hidden" }, style]}>
      {showPhoto ? (
        <Image
          source={{
            uri: `${config.apiUrl}/photos/${encodeURIComponent(photoId)}/image?size=${size}`,
            headers: { Authorization: `Bearer ${token}` },
            cacheKey: `photo-${photoId}-${size}`,
          }}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
          style={StyleSheet.absoluteFill}
          accessibilityIgnoresInvertColors
        />
      ) : (
        // Photos arrive after the yard team adds them; a calm placeholder, not a spinner.
        <View style={styles.placeholder}>
          <SymbolView
            name={{ ios: "car.side", android: "directions_car", web: "directions_car" }}
            size={44}
            tintColor={t.textMuted}
          />
        </View>
      )}
    </View>
  );
}

export function StatusChip({ status }: { status: VehicleStatus }) {
  const t = useTheme();
  const tone = statusTone(status, t);
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <View style={[styles.chipDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.chipText, { color: tone.fg }]}>{statusLabel[status]}</Text>
    </View>
  );
}

// Loading port ---ship--- destination port. `progress` is 0..1 (see journeyProgress).
export function PortTrack({
  from,
  to,
  progress,
}: {
  from: string | null;
  to: string | null;
  progress: number;
}) {
  const t = useTheme();
  const pct = `${Math.round(progress * 100)}%` as const;
  return (
    <View
      style={styles.track}
      accessible
      accessibilityLabel={`From ${from ?? "Japan"} to ${to ?? "destination"}`}
    >
      <Text style={[styles.port, { color: t.text }]} numberOfLines={1}>
        {from ?? "Japan"}
      </Text>
      {/* Inset by half the ship so the marker stays inside the track at 0% and 100%. */}
      <View style={styles.line}>
        <View style={[styles.rail, { backgroundColor: t.border }]} />
        <View style={[styles.fill, { width: pct, backgroundColor: t.accent }]} />
        <View style={[styles.ship, { left: pct, backgroundColor: t.accent, borderColor: t.background }]}>
          <SymbolView
            name={{ ios: "ferry.fill", android: "directions_boat", web: "directions_boat" }}
            size={10}
            tintColor={t.onAccent}
          />
        </View>
      </View>
      <Text style={[styles.port, { color: t.text, textAlign: "right" }]} numberOfLines={1}>
        {to ?? "Destination"}
      </Text>
    </View>
  );
}

const SHIP = 22;

const styles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: "600" },
  track: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  port: { fontSize: 12, fontWeight: "700", maxWidth: 84 },
  line: { flex: 1, height: SHIP, justifyContent: "center", marginHorizontal: SHIP / 2 },
  rail: { position: "absolute", left: 0, right: 0, height: 2, borderRadius: 1 },
  fill: { position: "absolute", left: 0, height: 2, borderRadius: 1 },
  ship: {
    position: "absolute",
    width: SHIP,
    height: SHIP,
    marginLeft: -SHIP / 2,
    borderRadius: SHIP / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
