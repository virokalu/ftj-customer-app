import { createContext, useContext, useEffect, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { raised } from "@/components/ui";
import { radius, spacing, useTheme } from "@/theme/theme";

// Loading skeletons: grey blocks ("bones") in the shape of the content that is on its way, so
// the page keeps its layout while it loads and the real content drops into place. Every bone
// inside one <Skeleton> pulses together. Still under Reduce Motion.

const PulseContext = createContext<SharedValue<number> | null>(null);

/** Wraps a loading layout: one shared pulse, and one "Loading" for screen readers. */
export function Skeleton({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduceMotion, pulse]);
  return (
    <PulseContext.Provider value={pulse}>
      <View style={style} accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
        {children}
      </View>
    </PulseContext.Provider>
  );
}

/** One grey block. Use inside a <Skeleton>. */
export function Bone({
  width = "100%",
  height = 12,
  round,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  /** Corner radius; defaults to a soft rounded bar. Pass height / 2 for a circle or pill. */
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const pulse = useContext(PulseContext);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse ? 0.55 + 0.45 * pulse.value : 0.8 }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: round ?? Math.min(6, height / 2), backgroundColor: t.border },
        style,
        pulseStyle,
      ]}
    />
  );
}

/** A raised card shell (same look as the real cards) to hold bones. */
export function BoneCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.card, raised, { backgroundColor: t.card, borderColor: t.border }, style]}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- page skeletons

/** Home: the "On the way" card (and its dots) while the vehicles load. */
export function OnTheWaySkeleton() {
  const { width } = useWindowDimensions();
  return (
    <Skeleton style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
      <BoneCard style={{ width: width - spacing.md * 2 - 28, padding: 0, overflow: "hidden" }}>
        <Bone height={150} round={0} />
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <Bone width="60%" height={18} />
          <Bone width="45%" />
          <Bone height={8} style={{ marginTop: spacing.sm }} />
        </View>
      </BoneCard>
      <View style={styles.dots}>
        <Bone width={16} height={6} round={3} />
        <Bone width={6} height={6} round={3} />
        <Bone width={6} height={6} round={3} />
      </View>
    </Skeleton>
  );
}

/** Rows of alerts (Home "New for you", the Updates tab). */
export function AlertRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Skeleton>
      <BoneCard style={{ paddingVertical: spacing.sm }}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={styles.alertRow}>
            <Bone width={36} height={36} round={18} />
            <View style={{ flex: 1, gap: 6 }}>
              <Bone width="55%" height={13} />
              <Bone width="85%" height={11} />
            </View>
          </View>
        ))}
      </BoneCard>
    </Skeleton>
  );
}

/** My vehicles: rows shaped like the vehicle cards. */
/** My vehicles in the two-per-row layout: poster-shaped tiles. */
export function PosterGridSkeleton({ width, rows = 2 }: { width: number; rows?: number }) {
  return (
    <Skeleton style={{ gap: spacing.md }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: "row", gap: spacing.md }}>
          {[0, 1].map((c) => (
            <BoneCard
              key={c}
              style={{ width, height: Math.round(width * 1.3), justifyContent: "flex-end", gap: 6 }}
            >
              <Bone width="70%" height={14} />
              <Bone width="45%" height={10} />
            </BoneCard>
          ))}
        </View>
      ))}
    </Skeleton>
  );
}

export function VehicleRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Skeleton style={{ gap: spacing.md }}>
      {Array.from({ length: rows }, (_, i) => (
        <BoneCard key={i} style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Bone width={92} height={70} round={radius.md} />
            <View style={{ flex: 1, gap: 8, paddingTop: 2 }}>
              <Bone width="70%" height={15} />
              <Bone width="40%" height={11} />
              <Bone width="55%" height={18} round={9} />
            </View>
          </View>
          <Bone height={8} />
        </BoneCard>
      ))}
    </Skeleton>
  );
}

/** The vehicle page while the vehicle loads: gallery, title, status card, tabs, a panel. */
export function VehiclePageSkeleton({ topInset }: { topInset: number }) {
  return (
    <Skeleton>
      <View style={{ paddingTop: topInset }}>
        <Bone height={280} round={0} />
      </View>
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ gap: 8 }}>
          <Bone width="65%" height={22} />
          <Bone width="45%" />
        </View>
        <BoneCard style={{ gap: spacing.sm }}>
          <Bone width="30%" height={10} />
          <Bone width="55%" height={20} />
          <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
            {Array.from({ length: 9 }, (_, i) => (
              <Bone key={i} width={undefined} height={4} round={2} style={{ flex: 1 }} />
            ))}
          </View>
        </BoneCard>
        <Bone height={40} round={radius.md} />
        <BoneCard style={{ gap: spacing.md }}>
          <Bone width="40%" />
          <Bone width="70%" />
          <Bone width="55%" />
        </BoneCard>
      </View>
    </Skeleton>
  );
}

/** Vehicle page, Documents: the two document rows. */
export function DocumentRowsSkeleton() {
  return (
    <Skeleton>
      <BoneCard style={{ paddingVertical: spacing.sm, gap: spacing.md }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <Bone width={36} height={36} round={10} />
            <View style={{ flex: 1, gap: 6 }}>
              <Bone width="50%" height={13} />
              <Bone width="70%" height={11} />
            </View>
          </View>
        ))}
      </BoneCard>
    </Skeleton>
  );
}

/** Vehicle page, Timeline: the nine steps. */
export function TimelineSkeleton() {
  return (
    <Skeleton>
      <BoneCard style={{ gap: spacing.md }}>
        {Array.from({ length: 9 }, (_, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <Bone width={20} height={20} round={10} />
            <Bone width={`${45 + ((i * 17) % 35)}%` as DimensionValue} height={13} />
          </View>
        ))}
      </BoneCard>
    </Skeleton>
  );
}

/** Vehicle page, Photos: a grid of tiles. */
export function PhotoGridSkeleton({ tile }: { tile: number }) {
  return (
    <Skeleton style={styles.grid}>
      {Array.from({ length: 4 }, (_, i) => (
        <Bone key={i} width={tile} height={tile * 0.75} round={radius.md} />
      ))}
    </Skeleton>
  );
}

/** Account: the profile card. */
export function ProfileSkeleton() {
  return (
    <Skeleton>
      <BoneCard style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Bone width={56} height={56} round={28} />
        <View style={{ flex: 1, gap: 8 }}>
          <Bone width="55%" height={16} />
          <Bone width="75%" height={12} />
          <Bone width="45%" height={10} />
        </View>
      </BoneCard>
    </Skeleton>
  );
}

/** Settings screens (Notifications): groups of switch rows. */
export function SettingsSkeleton({ groups = [5, 2] }: { groups?: number[] }) {
  return (
    <Skeleton style={{ gap: spacing.lg }}>
      {groups.map((rows, g) => (
        <View key={g} style={{ gap: spacing.sm }}>
          <Bone width="30%" height={10} />
          <BoneCard style={{ gap: spacing.lg, paddingVertical: spacing.md + 2 }}>
            {Array.from({ length: rows }, (_, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Bone width="50%" height={13} />
                  <Bone width="70%" height={10} />
                </View>
                <Bone width={46} height={28} round={14} />
              </View>
            ))}
          </BoneCard>
        </View>
      ))}
    </Skeleton>
  );
}

/** Forms (Personal details): label + field pairs. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Skeleton style={{ gap: spacing.md }}>
      {Array.from({ length: fields }, (_, i) => (
        <View key={i} style={{ gap: 6 }}>
          <Bone width="25%" height={10} />
          <Bone height={48} round={radius.md} />
        </View>
      ))}
    </Skeleton>
  );
}

/** Help & FAQs: the question rows. */
export function FaqSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Skeleton>
      <BoneCard style={{ gap: spacing.lg, paddingVertical: spacing.md + 2 }}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <Bone width={`${55 + ((i * 13) % 30)}%` as DimensionValue} height={14} />
            <View style={{ flex: 1 }} />
            <Bone width={12} height={12} round={6} />
          </View>
        ))}
      </BoneCard>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5 },
  alertRow: { flexDirection: "row", gap: spacing.md, alignItems: "center", paddingVertical: spacing.sm + 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
