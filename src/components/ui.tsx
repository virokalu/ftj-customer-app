import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassLayer, liquidGlass } from "@/components/glass";
import { radius, spacing, useTheme } from "@/theme/theme";

export function Screen({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.canvas }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.md }}>{children}</View>
    </SafeAreaView>
  );
}

export function AppText({ muted, style, ...props }: TextProps & { muted?: boolean }) {
  const t = useTheme();
  return <Text {...props} style={[{ color: muted ? t.textMuted : t.text, fontSize: 16 }, style]} />;
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <AppText style={{ fontSize: 28, fontWeight: "700", marginVertical: spacing.md }}>{children}</AppText>
  );
}

/**
 * One small "pop" (to 105% and smoothly back, no bounce) for press feedback. `trigger` is called
 * on press-in so the pop is seen even when the press navigates away. Off under Reduce Motion.
 * `to` is how big it grows: less for big content such as a whole card.
 */
export function usePop(to = 1.05) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const trigger = () => {
    if (reduceMotion) return;
    scale.set(
      withSequence(
        withTiming(to, { duration: 100, easing: Easing.out(Easing.quad) }),
        // A plain timed return (no spring), so it settles without bouncing.
        withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  };
  return { style, trigger };
}

/** A tappable link or row that pops once when pressed instead of dimming (Sign in page links). */
export function PopPressable({
  children,
  style,
  containerStyle,
  onPressIn,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  /** Layout of the content that pops (e.g. an icon + text row). */
  style?: StyleProp<ViewStyle>;
  /** Placement of the tap area itself (e.g. alignSelf, margins). */
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const pop = usePop();
  return (
    <Pressable
      {...props}
      style={containerStyle}
      onPressIn={(e) => {
        pop.trigger();
        onPressIn?.(e);
      }}
    >
      <Animated.View style={[style, pop.style]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * A button whose content (its text or icon) pops once when pressed, while the button itself stays
 * put and keeps its own `style` (which may be a function of `pressed`). `contentStyle` lays out
 * the content when there is more than one child (e.g. an icon + text row). `glass` (the corner
 * radius) puts Liquid Glass behind it on iOS 26+ in place of its fill; elsewhere the fill stays.
 */
export function PopButton({
  children,
  contentStyle,
  onPressIn,
  glass,
  glassScheme,
  popScale,
  style,
  ...props
}: Omit<PressableProps, "children"> & {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  glass?: number;
  /** Force dark glass over photos, whatever the app theme. */
  glassScheme?: "light" | "dark";
  /** How big the content pops (see usePop); smaller for whole cards. */
  popScale?: number;
}) {
  const pop = usePop(popScale);
  const onGlass = glass !== undefined && liquidGlass;
  return (
    <Pressable
      {...props}
      style={
        onGlass
          ? (state) => [typeof style === "function" ? style(state) : style, glassFill]
          : style
      }
      onPressIn={(e) => {
        pop.trigger();
        onPressIn?.(e);
      }}
    >
      {onGlass ? <GlassLayer radius={glass} scheme={glassScheme} /> : null}
      <Animated.View style={[contentStyle, pop.style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({
  label: text,
  onPress,
  loading,
  disabled,
  variant = "primary",
  haptic,
  pop = true,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** `glass`: Liquid Glass behind a plain label, for buttons floating over content. */
  variant?: "primary" | "secondary" | "danger" | "glass";
  /** A light haptic "click" on press, like native iOS buttons (Welcome, Sign in). */
  haptic?: boolean;
  /**
   * Press feedback: the label pops once (to 105% and back) instead of the whole button dimming
   * while pressed. On by default for every button.
   */
  pop?: boolean;
}) {
  const t = useTheme();
  const primary = variant === "primary";
  const danger = variant === "danger";
  const glass = variant === "glass";
  // Secondary buttons are glass too where Liquid Glass exists, keeping their hairline edge.
  const glassBehind = glass || (variant === "secondary" && liquidGlass);
  const fill = primary ? t.accent : danger ? t.danger : glassBehind ? "transparent" : t.card;
  const label = primary ? t.onAccent : danger ? t.onDanger : t.text;

  const labelPop = usePop();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || disabled}
      accessibilityState={{ disabled: !!(loading || disabled), busy: !!loading }}
      onPress={onPress}
      // On press-in so the tick is felt the moment the finger lands. Best effort: devices
      // without a haptic engine (and the simulator) simply do nothing.
      onPressIn={() => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        if (pop) labelPop.trigger();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: fill,
          borderColor: primary || danger || glass ? fill : t.border,
          // Pop buttons never dim on press: the label pop is their feedback.
          opacity: disabled ? 0.45 : (pressed && !pop) || loading ? 0.7 : 1,
        },
      ]}
    >
      {/* Behind the label and outside its pop, so only the text scales. */}
      {glassBehind ? <GlassLayer radius={radius.md} /> : null}
      {loading ? (
        <ActivityIndicator color={label} />
      ) : (
        <Animated.Text style={[{ color: label, fontSize: 16, fontWeight: "600" }, labelPop.style]}>
          {text}
        </Animated.Text>
      )}
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={[
        raised,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.xs,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
      {children}
    </View>
  );
}

/**
 * The app's card look: a `card`-coloured panel raised off the `canvas` page with a hairline
 * border (what separates it in dark mode) and a soft shadow (what lifts it in light mode).
 * Pair it with `{ backgroundColor: t.card, borderColor: t.border }` and the panel's own radius.
 */
export const raised = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
}).card;

/**
 * The top of a bottom sheet (Filter vehicles, Link a vehicle): a grabber line in the centre that
 * shows it can be pulled down, the title on the left, and a ✕ (black in light mode, white in dark).
 */
export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const t = useTheme();
  return (
    <>
      <View style={[styles.grabber, { backgroundColor: t.textMuted }]} />
      <View style={[styles.sheetHeader, { borderBottomColor: t.border }]}>
        <Text style={[styles.sheetTitle, { color: t.text }]}>{title}</Text>
        <PopButton onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} size={16} tintColor={t.text} />
        </PopButton>
      </View>
    </>
  );
}

/**
 * The round glass back button (vehicle page, and the header of every pushed page): a 36 pt circle
 * with a chevron. The glass sits behind the button so only the chevron pops. Goes back, or Home
 * when there is nothing to go back to (opened from a link).
 */
export function BackButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.back, style]}>
      <GlassLayer
        radius={18}
        fallback={<View style={[styles.backFallback, raised, { backgroundColor: t.card, borderColor: t.border }]} />}
      />
      <PopButton
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        style={styles.backButton}
      >
        <SymbolView
          name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
          size={16}
          tintColor={t.text}
        />
      </PopButton>
    </View>
  );
}

// Over Liquid Glass a button drops its own fill and shadow (a shadow on a clear view would
// outline the icon instead of the button).
const glassFill: ViewStyle = { backgroundColor: "transparent", shadowOpacity: 0, elevation: 0 };

const styles = StyleSheet.create({
  grabber: { alignSelf: "center", width: 48, height: 5, borderRadius: 2.5, marginTop: spacing.sm, opacity: 0.4 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  back: { width: 36, height: 36 },
  backFallback: { flex: 1, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  backButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
});
