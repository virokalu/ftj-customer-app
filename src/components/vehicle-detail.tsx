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
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { GlassLayer } from "@/components/glass";
import { SegmentTrack } from "@/components/segment-track";
import { JourneyIcon } from "@/components/journey-icons";
import { PopButton, raised } from "@/components/ui";
import { DocumentRowsSkeleton, PhotoGridSkeleton, TimelineSkeleton } from "@/components/skeleton";
import { PHOTO_GLASS_TINT, PortTrack, VehicleCover } from "@/components/vehicle-bits";
import { openDocument } from "@/features/documents/open-document";
import {
  formatDate,
  journeyLine,
  journeyProgress,
  journeyStage,
  statusLabel,
  vehicleName,
} from "@/features/vehicles/status";
import { documentLabels, nextStep, stepDate, stepLabel } from "@/features/vehicles/timeline";
import { ApiError } from "@/lib/api/client";
import type { Photo, TimelineStep, VehicleDetail, VehicleDocument, VehicleStatus } from "@/lib/api/schemas";
import { radius, spacing, useTheme } from "@/theme/theme";

// Building blocks of the vehicle page (sheet 3). The page itself wires data and state.

// ---------------------------------------------------------------- gallery

export const GALLERY_HEIGHT = 320;

// Behind the photos while they load, and the "coming soon" backdrop: dark so the white name reads.
const GALLERY_BACKDROP = "#24262C";

/**
 * Swipeable photos at the top of the page, with the status, name and details on a dark fade at
 * the bottom of the photo. Without photos, a dark backdrop says photos are coming.
 */
export function Gallery({
  vehicle,
  photos,
  onOpen,
}: {
  vehicle: VehicleDetail;
  photos: Photo[];
  onOpen: (index: number) => void;
}) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  // Year, grade and chassis number: the details a customer recognises (no internal FTJ serial).
  const details = [vehicle.year, vehicle.grade, vehicle.chassisNo ? `Chassis ${vehicle.chassisNo}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.gallery, { backgroundColor: GALLERY_BACKDROP }]}>
      {photos.length > 0 ? (
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
      ) : (
        <View style={styles.soon}>
          <SymbolView
            name={{ ios: "camera", android: "photo_camera", web: "photo_camera" }}
            size={22}
            tintColor="rgba(255,255,255,0.75)"
          />
          <Text style={styles.soonTitle}>Photos coming soon</Text>
          <Text style={styles.soonBody}>Our yard team takes photos once the car reaches the export yard.</Text>
        </View>
      )}

      {/* Dark fade over the bottom of the photo so the white text reads on any photo. */}
      <Svg style={styles.galleryFade} pointerEvents="none" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="galleryFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.75} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#galleryFade)" />
      </Svg>

      <View style={styles.galleryInfo} pointerEvents="none">
        <View style={styles.galleryChipRow}>
          <View style={styles.galleryChip}>
            <GlassLayer
              radius={999}
              scheme="dark"
              tint={PHOTO_GLASS_TINT}
              fallback={<View style={[StyleSheet.absoluteFill, styles.galleryChipFallback]} />}
            />
            <View style={styles.galleryChipDot} />
            <Text style={styles.galleryChipText}>{statusLabel[vehicle.status]}</Text>
          </View>
          {photos.length > 1 ? (
            <View style={styles.count}>
              <GlassLayer
                radius={999}
                scheme="dark"
                tint={PHOTO_GLASS_TINT}
                fallback={<View style={[StyleSheet.absoluteFill, styles.countFallback]} />}
              />
              <SymbolView name={{ ios: "photo", android: "image", web: "image" }} size={12} tintColor="#FFFFFF" />
              <Text style={styles.countText}>
                {index + 1}/{photos.length}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.galleryName} numberOfLines={2}>
          {vehicleName(vehicle)}
        </Text>
        {details ? (
          <Text style={styles.galleryDetails} numberOfLines={1}>
            {details}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- status card

export function StatusCard({
  vehicle,
  steps,
}: {
  vehicle: VehicleDetail;
  steps: TimelineStep[] | undefined;
}) {
  const t = useTheme();
  const next = steps ? nextStep(steps) : null;
  const nextDate = next ? stepDate(next, vehicle) : null;

  return (
    <View style={[styles.panel, raised, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={[styles.caption, { color: t.textMuted }]}>Current status</Text>
      <Text style={[styles.statusLine, { color: t.text }]}>{journeyLine(vehicle)}</Text>
      <StageTrack status={vehicle.status} />
      {next ? (
        <View style={[styles.nextRow, { borderTopColor: t.border }]}>
          <View style={[styles.iconDot, { backgroundColor: t.iconTile }]}>
            <SymbolView name={stepIcon(next)} size={16} tintColor={t.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.caption, { color: t.textMuted }]}>Next step</Text>
            <Text style={[styles.nextText, { color: t.text }]} numberOfLines={1}>
              {stepLabel(next, vehicle)}
              {nextDate ? ` · ${nextDate.replace("Expected ", "")}` : ""}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// The four stages a customer follows, made from the vehicle's status. The nine detailed steps
// stay on the Timeline tab.
const stages = [
  { label: "In Japan", icon: "loading" },
  { label: "Booked", icon: "booked" },
  { label: "At sea", icon: "sailing" },
  { label: "Arrived", icon: "arrived" },
] as const;

/** Index of the current stage; every stage before it is done. 4 = all done (delivered). */
function currentStage(status: VehicleStatus): number {
  switch (status) {
    case "BOOKING_RECEIVED":
      return 1;
    case "SHIPPED":
      return 2;
    case "ARRIVED":
      return 3;
    case "DELIVERED":
      return 4;
    default:
      return 0; // PENDING (and unknown): still in Japan
  }
}

/** In Japan → Booked → At sea → Arrived: done stages solid crimson, the current one ringed. */
function StageTrack({ status }: { status: VehicleStatus }) {
  const t = useTheme();
  const current = currentStage(status);
  const stage = stages[current];
  const label = stage
    ? `Stage ${current + 1} of ${stages.length}: ${stage.label}`
    : "Delivered. All stages done";
  return (
    <View style={styles.stages} accessible accessibilityLabel={label}>
      {/* Connectors run behind the circles, from one stage's centre to the next. */}
      {stages.slice(1).map((_, i) => (
        <View
          key={i}
          style={[
            styles.connector,
            {
              left: `${((i + 0.5) / stages.length) * 100}%`,
              width: `${100 / stages.length}%`,
              backgroundColor: i < current ? t.accent : t.border,
            },
          ]}
        />
      ))}
      {stages.map((s, i) => {
        const done = i < current;
        const now = i === current;
        const fill = done ? t.accent : now ? t.accentSoft : t.iconTile;
        const ink = done ? t.onAccent : now ? t.accentText : t.textMuted;
        return (
          <View key={s.label} style={styles.stage}>
            <View
              style={[
                styles.stageCircle,
                { backgroundColor: fill, borderColor: now ? t.accent : fill },
              ]}
            >
              {s.icon === "booked" ? (
                <SymbolView
                  name={{ ios: "calendar", android: "event", web: "event" }}
                  size={15}
                  tintColor={ink}
                />
              ) : (
                <JourneyIcon stage={s.icon} size={16} color={ink} cutout={fill} />
              )}
            </View>
            <Text
              style={[
                styles.stageLabel,
                { color: now ? t.accentText : done ? t.text : t.textMuted, fontWeight: now ? "700" : "600" },
              ]}
              numberOfLines={1}
            >
              {s.label}
            </Text>
          </View>
        );
      })}
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
    <SegmentTrack
      count={tabs.length}
      index={Math.max(0, tabs.findIndex((tab) => tab.key === value))}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <PopButton
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            // The highlight behind the selected tab is the track's sliding pill.
            style={styles.segmentButton}
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
          </PopButton>
        );
      })}
    </SegmentTrack>
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
          <DocumentRowsSkeleton />
        ) : (
          <View
            style={[styles.panel, styles.list, raised, { backgroundColor: t.card, borderColor: t.border }]}
          >
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
          style={[styles.panel, raised, { backgroundColor: t.card, borderColor: t.border, gap: spacing.md }]}
        >
          <PortTrack
            from={vehicle.portOfLoading}
            to={vehicle.portOfDischarge ?? vehicle.destination}
            progress={journeyProgress(vehicle)}
            stage={journeyStage(vehicle)}
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
      <View style={[styles.docBadge, { backgroundColor: ready ? t.accentSoft : t.canvas }]}>
        <Text style={{ color: ready ? t.accentText : t.textMuted, fontSize: 11, fontWeight: "700" }}>
          {label.short}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.docName, { color: t.text }]} numberOfLines={1}>
          {doc && type === "OTHER" ? doc.name : label.name}
        </Text>
        {ready ? (
          <Text style={{ color: t.textMuted, fontSize: 12 }}>
            <Text style={{ color: t.text, fontWeight: "600" }}>Ready</Text> · added {shortDate(doc.createdAt)}
          </Text>
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
        <View style={[styles.pill, { backgroundColor: t.canvas }]}>
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
    <View style={[styles.panel, styles.fact, raised, { backgroundColor: t.card, borderColor: t.border }]}>
      <SymbolView name={icon} size={16} tintColor={t.accentText} />
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
  if (!steps) return <TimelineSkeleton />;
  const next = nextStep(steps);

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Journey</SectionLabel>
      <View
        style={[
          styles.panel,
          raised,
          { backgroundColor: t.card, borderColor: t.border, paddingVertical: spacing.sm },
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
                        ? { backgroundColor: t.card, borderColor: t.accent }
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
  if (loading || !photos) return <PhotoGridSkeleton tile={tile} />;
  if (photos.length === 0) {
    return (
      <View style={[styles.panel, raised, { backgroundColor: t.card, borderColor: t.border }]}>
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

const STAGE = 36;

const styles = StyleSheet.create({
  gallery: { height: GALLERY_HEIGHT },
  soon: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.xl,
  },
  soonTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  soonBody: { color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 18, textAlign: "center" },
  galleryFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  galleryInfo: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, gap: 6 },
  galleryChipRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  galleryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  // Photo chips without Liquid Glass: the frosted white and dark pills used before.
  galleryChipFallback: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  galleryChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  galleryChipText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  galleryName: { color: "#FFFFFF", fontSize: 26, fontWeight: "700" },
  galleryDetails: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500" },
  count: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countFallback: { borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)" },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  panel: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  list: { paddingVertical: 0 },
  caption: { fontSize: 12 },
  statusLine: { fontSize: 22, fontWeight: "700", marginTop: 2 },
  stages: { flexDirection: "row", marginTop: spacing.md },
  stage: { flex: 1, alignItems: "center", gap: 6 },
  stageCircle: {
    width: STAGE,
    height: STAGE,
    borderRadius: STAGE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stageLabel: { fontSize: 12 },
  connector: { position: "absolute", top: STAGE / 2 - 1, height: 2 },
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
