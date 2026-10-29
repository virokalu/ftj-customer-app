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
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const t = useTheme();
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || disabled}
      accessibilityState={{ disabled: !!(loading || disabled), busy: !!loading }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? t.accent : t.surface,
          borderColor: primary ? t.accent : t.border,
          opacity: disabled ? 0.45 : pressed || loading ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? t.onAccent : t.text} />
      ) : (
        <Text style={{ color: primary ? t.onAccent : t.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
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
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>{children}</View>;
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
