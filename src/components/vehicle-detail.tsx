import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { PortTrack, VehicleCover } from "@/components/vehicle-bits";
import { openDocument } from "@/features/documents/open-document";
import { formatDate, journeyLine, journeyProgress } from "@/features/vehicles/status";
import { documentLabels, nextStep, stepDate, stepLabel } from "@/features/vehicles/timeline";
import { ApiError } from "@/lib/api/client";
import type { Photo, TimelineStep, VehicleDetail, VehicleDocument } from "@/lib/api/schemas";
import { radius, spacing, useTheme } from "@/theme/theme";

// Building blocks of the vehicle page (sheet 3). The page itself wires data and state.

// ---------------------------------------------------------------- gallery

export const GALLERY_HEIGHT = 280;

/** Swipeable photos at the top of the page, or the "Photos coming soon" state. */
export function Gallery({ photos, onOpen }: { photos: Photo[]; onOpen: (index: number) => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <View style={[styles.gallery, styles.soon, { backgroundColor: t.surface }]}>
        <View style={[styles.soonIcon, { backgroundColor: t.background }]}>
          <SymbolView
            name={{ ios: "camera", android: "photo_camera", web: "photo_camera" }}
            size={22}
            tintColor={t.accent}
          />
        </View>
        <Text style={[styles.soonTitle, { color: t.text }]}>Photos coming soon</Text>
        <Text style={[styles.soonBody, { color: t.textMuted }]}>
          Our yard team takes photos once the car reaches the export yard. We&apos;ll let you know.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gallery}>
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <Pressable
            onPress={() => onOpen(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Photo ${i + 1} of ${photos.length}. Opens full screen`}
          >
            <VehicleCover photoId={item.id} size="full" style={{ width, height: GALLERY_HEIGHT }} />
          </Pressable>
        )}
      />
      <View style={styles.count}>
        <SymbolView name={{ ios: "photo", android: "image", web: "image" }} size={12} tintColor="#FFFFFF" />
        <Text style={styles.countText}>
          {index + 1}/{photos.length}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- status card

export function StatusCard({
  vehicle,
  steps,
  onDetails,
}: {
  vehicle: VehicleDetail;
  steps: TimelineStep[] | undefined;
  onDetails: () => void;
}) {
  const t = useTheme();
  const next = steps ? nextStep(steps) : null;
  const nextDate = next ? stepDate(next, vehicle) : null;
  const done = steps?.filter((s) => s.completed).length ?? 0;

  return (
    <View style={[styles.panel, { backgroundColor: t.background, borderColor: t.border }]}>
      <Text style={[styles.caption, { color: t.textMuted }]}>Current status</Text>
      <Text style={[styles.statusLine, { color: t.text }]}>{journeyLine(vehicle)}</Text>
      {steps ? (
        // One segment per timeline step. Filled = recorded, wherever it sits (steps can complete
        // out of order), so this is a count, not a position.
        <View
          style={styles.segments}
          accessible
          accessibilityLabel={`${done} of ${steps.length} steps completed`}
        >
          {steps.map((s, i) => (
            <View key={i} style={[styles.segment, { backgroundColor: s.completed ? t.accent : t.border }]} />
          ))}
        </View>
      ) : null}
      {next ? (
        <View style={[styles.nextRow, { borderTopColor: t.border }]}>
          <View style={[styles.iconDot, { backgroundColor: t.accentSoft }]}>
            <SymbolView name={stepIcon(next)} size={16} tintColor={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.caption, { color: t.textMuted }]}>Next step</Text>
            <Text style={[styles.nextText, { color: t.text }]} numberOfLines={1}>
              {stepLabel(next, vehicle)}
              {nextDate ? ` · ${nextDate.replace("Expected ", "")}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={onDetails}
            accessibilityRole="button"
            accessibilityLabel="Timeline details"
            hitSlop={8}
          >
            <Text style={{ color: t.accentText, fontSize: 14, fontWeight: "600" }}>Details</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function stepIcon(step: TimelineStep): SymbolViewProps["name"] {
  switch (step.type) {
    case "EXPORT_CERT_ISSUED":
    case "BL_ISSUED":
      return { ios: "doc.text", android: "description", web: "description" };
    case "SHIPPED":
    case "BOOKING_RECEIVED":
      return { ios: "ferry", android: "directions_boat", web: "directions_boat" };
    case "ARRIVED":
      return { ios: "mappin.and.ellipse", android: "place", web: "place" };
    case "DELIVERED":
      return { ios: "checkmark.seal", android: "verified", web: "verified" };
    default:
      return { ios: "car", android: "directions_car", web: "directions_car" };
  }
}

// ---------------------------------------------------------------- tabs

export type VehicleTab = "overview" | "timeline" | "photos";
const tabs: { key: VehicleTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "photos", label: "Photos" },
];

export function Segmented({ value, onChange }: { value: VehicleTab; onChange: (v: VehicleTab) => void }) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.surface }]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segmentButton,
              selected && {
                backgroundColor: t.background,
                borderColor: t.border,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Text
              style={{
                color: selected ? t.text : t.textMuted,
                fontSize: 14,
                fontWeight: selected ? "600" : "500",
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- overview

export function OverviewTab({
  vehicle,
  documents,
  documentsLoading,
}: {
  vehicle: VehicleDetail;
  documents: VehicleDocument[] | undefined;
  documentsLoading: boolean;
}) {
  const t = useTheme();
  const newest = (type: VehicleDocument["type"]) => documents?.find((d) => d.type === type) ?? null;
  const others = documents?.filter((d) => d.type !== "EC" && d.type !== "BL") ?? [];

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Documents</SectionLabel>
        {documentsLoading ? (
          <ActivityIndicator color={t.accent} />
        ) : (
          <View style={[styles.panel, styles.list, { backgroundColor: t.background, borderColor: t.border }]}>
            {/* EC and BL are always listed, Ready or Pending, because the customer waits for them. */}
            <DocumentRow
              type="EC"
              doc={newest("EC")}
              pendingText="Added once your car is cleared for export"
            />
            <Divider />
            <DocumentRow type="BL" doc={newest("BL")} pendingText="Issued after the car ships" />
            {others.map((d) => (
              <View key={d.id}>
                <Divider />
                <DocumentRow type={d.type} doc={d} pendingText="" />
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.note, { color: t.textMuted }]}>
          <Text style={{ fontWeight: "700" }}>EC</Text> shows the car is deregistered in Japan and cleared for
          export. <Text style={{ fontWeight: "700" }}>BL</Text> is what your clearing agent needs to collect
          the car.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Vehicle</SectionLabel>
        <View style={styles.grid}>
          <Fact
            icon={{ ios: "calendar", android: "event", web: "event" }}
            value={vehicle.year}
            label="Year"
          />
          <Fact icon={{ ios: "tag", android: "sell", web: "sell" }} value={vehicle.brand} label="Brand" />
          <Fact
            icon={{ ios: "list.bullet", android: "list", web: "list" }}
            value={vehicle.model}
            label="Model"
          />
          <Fact icon={{ ios: "star", android: "star", web: "star" }} value={vehicle.grade} label="Grade" />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Shipping</SectionLabel>
        <View
          style={[styles.panel, { backgroundColor: t.background, borderColor: t.border, gap: spacing.md }]}
        >
          <PortTrack
            from={vehicle.portOfLoading}
            to={vehicle.portOfDischarge ?? vehicle.destination}
            progress={journeyProgress(vehicle)}
          />
          <View style={styles.pairs}>
            <Pair label="Departure (ETD)" value={formatDate(vehicle.etd)} />
            <Pair label="Arrival (ETA)" value={formatDate(vehicle.eta)} />
            <Pair label="Vessel" value={vehicle.vesselName} />
            <Pair label="Destination" value={vehicle.destination} />
            <Pair label="Voyage" value={vehicle.voyageNo} />
            <Pair label="Bill of lading no." value={vehicle.blNo} />
            <Pair
              label="Shipping method"
              value={
                vehicle.shippingMethod === "RORO"
                  ? "Roll-on/roll-off"
                  : vehicle.shippingMethod === "CONTAINER"
                    ? "Container"
                    : null
              }
            />
            <Pair label="Container" value={vehicle.containerNumber} />
          </View>
        </View>
      </View>
    </View>
  );
}

function DocumentRow({
  type,
  doc,
  pendingText,
}: {
  type: VehicleDocument["type"];
  doc: VehicleDocument | null;
  pendingText: string;
}) {
  const t = useTheme();
  const [opening, setOpening] = useState(false);
  const label = documentLabels[type];
  const ready = doc !== null;

  async function open() {
    if (!doc || opening) return;
    setOpening(true);
    try {
      await openDocument(doc);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : -1;
      Alert.alert(
        status === 404
          ? "This file is no longer available"
          : status === 0
            ? "You're offline"
            : "Couldn't open the document",
        status === 404 ? undefined : "Please try again in a moment.",
      );
    } finally {
      setOpening(false);
    }
  }

  return (
    <Pressable
      onPress={open}
      disabled={!ready}
      accessibilityRole={ready ? "button" : undefined}
      accessibilityLabel={`${label.name}. ${ready ? "Ready. Opens the document" : `Pending. ${pendingText}`}`}
      style={({ pressed }) => [styles.docRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.docBadge, { backgroundColor: ready ? t.accentSoft : t.surface }]}>
        <Text style={{ color: ready ? t.accentText : t.textMuted, fontSize: 11, fontWeight: "700" }}>
          {label.short}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.docName, { color: t.text }]} numberOfLines={1}>
          {doc && type === "OTHER" ? doc.name : label.name}
        </Text>
        {ready ? (
          <Text style={{ color: t.success, fontSize: 12 }}>Ready · added {shortDate(doc.createdAt)}</Text>
        ) : (
          <Text style={{ color: t.textMuted, fontSize: 12 }} numberOfLines={2}>
            {pendingText}
          </Text>
        )}
      </View>
      {opening ? (
        <ActivityIndicator color={t.accent} />
      ) : ready ? (
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          size={13}
          tintColor={t.textMuted}
        />
      ) : (
        <View style={[styles.pill, { backgroundColor: t.surface }]}>
          <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: "600" }}>Pending</Text>
        </View>
      )}
    </Pressable>
  );
}

function Fact({
  icon,
  value,
  label,
}: {
  icon: SymbolViewProps["name"];
  value: string | number | null;
  label: string;
}) {
  const t = useTheme();
  return (
    <View style={[styles.panel, styles.fact, { backgroundColor: t.background, borderColor: t.border }]}>
      <SymbolView name={icon} size={16} tintColor={t.accent} />
      <Text style={[styles.factValue, { color: t.text }]} numberOfLines={1}>
        {value ?? "-"}
      </Text>
      <Text style={{ color: t.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Pair({ label, value }: { label: string; value: string | null }) {
  const t = useTheme();
  // Every field but a few can be null: hide the row rather than showing an empty value.
  if (!value) return null;
  return (
    <View style={styles.pair}>
      <Text style={{ color: t.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- timeline

export function TimelineTab({
  vehicle,
  steps,
}: {
  vehicle: VehicleDetail;
  steps: TimelineStep[] | undefined;
}) {
  const t = useTheme();
  if (!steps) return <ActivityIndicator color={t.accent} />;
  const next = nextStep(steps);

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Journey</SectionLabel>
      <View
        style={[
          styles.panel,
          { backgroundColor: t.background, borderColor: t.border, paddingVertical: spacing.sm },
        ]}
      >
        {steps.map((step, i) => {
          const date = stepDate(step, vehicle);
          const isNext = step === next;
          const last = i === steps.length - 1;
          return (
            <View
              key={step.type + i}
              style={styles.step}
              accessible
              accessibilityLabel={`${stepLabel(step, vehicle)}. ${step.completed ? `Completed${date ? ` on ${date}` : ""}` : (date ?? "Not yet")}`}
            >
              <View style={styles.rail}>
                <View
                  style={[
                    styles.node,
                    step.completed
                      ? { backgroundColor: t.accent, borderColor: t.accent }
                      : isNext
                        ? { backgroundColor: t.background, borderColor: t.accent }
                        : { backgroundColor: t.border, borderColor: t.border },
                  ]}
                >
                  {step.completed ? (
                    <SymbolView
                      name={{ ios: "checkmark", android: "check", web: "check" }}
                      size={11}
                      tintColor={t.onAccent}
                    />
                  ) : isNext ? (
                    <View style={[styles.nodeInner, { backgroundColor: t.accent }]} />
                  ) : null}
                </View>
                {last ? null : <View style={[styles.railLine, { backgroundColor: t.border }]} />}
              </View>
              <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.md }}>
                <Text
                  style={{
                    color: step.completed || isNext ? t.text : t.textMuted,
                    fontSize: 15,
                    fontWeight: step.completed || isNext ? "600" : "400",
                  }}
                >
                  {stepLabel(step, vehicle)}
                </Text>
                {date ? <Text style={{ color: t.textMuted, fontSize: 12 }}>{date}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={[styles.note, { color: t.textMuted }]}>
        Steps are confirmed by our team as they happen, so they can sometimes appear out of order.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- photos

export function PhotosTab({
  photos,
  loading,
  onOpen,
}: {
  photos: Photo[] | undefined;
  loading: boolean;
  onOpen: (index: number) => void;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const tile = (width - spacing.md * 2 - spacing.sm) / 2;
  if (loading || !photos) return <ActivityIndicator color={t.accent} />;
  if (photos.length === 0) {
    return (
      <View style={[styles.panel, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={{ color: t.textMuted, fontSize: 14 }}>
          Photos will appear here once our team adds them.
        </Text>
      </View>
    );
  }
  const latest = photos[photos.length - 1];

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>
        {`${photos.length} ${photos.length === 1 ? "photo" : "photos"}${latest ? ` · added ${shortDate(latest.createdAt)}` : ""}`}
      </SectionLabel>
      <View style={styles.photoGrid}>
        {photos.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => onOpen(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Photo ${i + 1} of ${photos.length}`}
          >
            <VehicleCover
              photoId={p.id}
              style={{ width: tile, height: tile * 0.75, borderRadius: radius.md }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- shared

function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{children}</Text>;
}

function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }} />;
}

// "22 Sep" for recent things. Document and photo dates are real timestamps, not UTC-midnight.
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const NODE = 20;

const styles = StyleSheet.create({
  gallery: { height: GALLERY_HEIGHT },
  soon: { alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  soonIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  soonTitle: { fontSize: 15, fontWeight: "700" },
  soonBody: { fontSize: 13, lineHeight: 18, textAlign: "center" },
  count: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  panel: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  list: { paddingVertical: 0 },
  caption: { fontSize: 12 },
  statusLine: { fontSize: 22, fontWeight: "700", marginTop: 2 },
  segments: { flexDirection: "row", gap: 4, marginTop: spacing.sm },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  nextText: { fontSize: 15, fontWeight: "600" },
  segmented: { flexDirection: "row", borderRadius: radius.md, padding: 3 },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md - 3,
  },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  docRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  docBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 15, fontWeight: "600" },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999 },
  note: { fontSize: 12, lineHeight: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  fact: { width: "48.5%", gap: 4 },
  factValue: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  pairs: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md },
  pair: { width: "50%", gap: 2, paddingRight: spacing.sm },
  step: { flexDirection: "row", gap: spacing.md },
  rail: { width: NODE, alignItems: "center" },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeInner: { width: 8, height: 8, borderRadius: 4 },
  railLine: { flex: 1, width: 2, marginVertical: 2 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
