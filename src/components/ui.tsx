import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { radius, spacing, useTheme } from "@/theme/theme";

export function Screen({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.background }}>
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

export function Button({
  label: text,
  onPress,
  loading,
  disabled,
  variant = "primary",
  haptic,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  /** A light haptic "click" on press, like native iOS buttons (Welcome, Sign in). */
  haptic?: boolean;
}) {
  const t = useTheme();
  const primary = variant === "primary";
  const danger = variant === "danger";
  const fill = primary ? t.accent : danger ? t.danger : t.surface;
  const label = primary ? t.onAccent : danger ? t.onDanger : t.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || disabled}
      accessibilityState={{ disabled: !!(loading || disabled), busy: !!loading }}
      onPress={onPress}
      // On press-in so the tick is felt the moment the finger lands. Best effort: devices
      // without a haptic engine (and the simulator) simply do nothing.
      onPressIn={
        haptic ? () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) : undefined
      }
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: fill,
          borderColor: primary || danger ? fill : t.border,
          opacity: disabled ? 0.45 : pressed || loading ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={label} />
      ) : (
        <Text style={{ color: label, fontSize: 16, fontWeight: "600" }}>{text}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderColor: t.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.xs,
      }}
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

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
});
