import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { statusLabel, statusTone, type JourneyStage } from "@/features/vehicles/status";
import { GlassLayer, liquidGlass } from "@/components/glass";
import { JourneyIcon } from "@/components/journey-icons";
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

// Dark glass with a dark tint, so white text stays readable even over bright photos (the photo
// count and card position chips).
export const PHOTO_GLASS_TINT = "rgba(0,0,0,0.35)";

/**
 * The status pill, the same everywhere (cards, Home, the vehicle page photo). Liquid Glass on
 * iOS 26+, tinted with the status colour. Elsewhere the solid status colours.
 */
export function StatusChip({ status }: { status: VehicleStatus }) {
  const t = useTheme();
  const tone = statusTone(status, t);
  // On glass: the status colour, see-through (about 65%), so the chip reads as tinted glass.
  // Shipped and Arrived have their own glass colours (see the theme): text in the status colour
  // over a light tint of it, like the other statuses.
  const glass =
    status === "SHIPPED"
      ? { fg: t.statusShippedGlass, tint: t.statusShippedGlassBg }
      : status === "ARRIVED"
        ? { fg: t.statusArrivedGlass, tint: t.statusArrivedGlassBg }
        : { fg: tone.fg, tint: `${tone.bg}A6` };
  const fg = liquidGlass ? glass.fg : tone.fg;
  return (
    <View style={[styles.chip, { backgroundColor: liquidGlass ? "transparent" : tone.bg }]}>
      {liquidGlass ? <GlassLayer radius={999} tint={glass.tint} /> : null}
      <View style={[styles.chipDot, { backgroundColor: fg }]} />
      <Text style={[styles.chipText, { color: fg }]}>{statusLabel[status]}</Text>
    </View>
  );
}

// The marker shows where the car is ("Places" icons, see JourneyIcon); this is what VoiceOver says.
const stageLabel: Record<JourneyStage, string> = {
  loading: "At the yard",
  sailing: "At sea",
  arrived: "Arrived",
};

// Loading port ---marker--- destination port. `progress` is 0..1 (see journeyProgress), `stage`
// picks the marker icon (see journeyStage).
export function PortTrack({
  from,
  to,
  progress,
  stage,
  stacked,
  full,
}: {
  from: string | null;
  to: string | null;
  progress: number;
  stage: JourneyStage;
  /**
   * The line runs the full width with the port names under its ends, so it starts and ends at
   * the same place on every card in a list, however long the names are (Boarding pass).
   */
  stacked?: boolean;
  /** Whole port names, wrapping onto more lines (the Shipping popup). */
  full?: boolean;
}) {
  const t = useTheme();
  const pct = `${Math.round(progress * 100)}%` as const;
  const fromName = from ?? "Japan";
  const toName = to ?? "Destination";
  // Inset by half the marker so it stays inside the track at 0% and 100%.
  const line = (
    <View style={styles.line}>
      <View style={[styles.rail, { backgroundColor: t.border }]} />
      <View style={[styles.fill, { width: pct, backgroundColor: t.accent }]} />
      <View style={[styles.ship, { left: pct, backgroundColor: t.accent, borderColor: t.card }]}>
        <JourneyIcon stage={stage} size={14} color={t.onAccent} cutout={t.accent} />
      </View>
    </View>
  );
  const label = `From ${fromName} to ${toName}. ${stageLabel[stage]}`;
  const lines = full ? undefined : 1;

  if (stacked) {
    return (
      <View style={{ gap: 4 }} accessible accessibilityLabel={label}>
        <View style={styles.stackedLine}>{line}</View>
        <View style={styles.stackedPorts}>
          <Text style={[styles.stackedPort, { color: t.text }]} numberOfLines={lines}>
            {fromName}
          </Text>
          <Text style={[styles.stackedPort, { color: t.text, textAlign: "right" }]} numberOfLines={lines}>
            {toName}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.track} accessible accessibilityLabel={label}>
      <Text style={[styles.port, { color: t.text }]} numberOfLines={lines}>
        {fromName}
      </Text>
      {line}
      <Text style={[styles.port, { color: t.text, textAlign: "right" }]} numberOfLines={lines}>
        {toName}
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
  stackedLine: { flexDirection: "row" },
  stackedPorts: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  stackedPort: { flexShrink: 1, fontSize: 12, fontWeight: "700" },
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
