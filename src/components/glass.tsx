import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

// Liquid Glass needs iOS 26+; the API check guards against the iOS 26 betas that crash without it.
export const liquidGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

/**
 * The glass behind a floating control (tab bar, Ask button, back button, photo chips): an
 * absolute-fill layer under the content, so the content can pop without the glass scaling.
 * iOS 26+: native Liquid Glass. Elsewhere: `fallback`, or the ultra-thin blur used before.
 */
export function GlassLayer({
  radius,
  variant = "regular",
  scheme,
  tint,
  fallback,
}: {
  radius: number;
  variant?: "regular" | "clear";
  /** Force light or dark glass (photo chips stay dark under their white text). */
  scheme?: "light" | "dark";
  /** A see-through colour over the glass, so labels stay readable over busy content. */
  tint?: string;
  fallback?: ReactNode;
}) {
  const system = useColorScheme();
  const dark = (scheme ?? system) === "dark";

  if (liquidGlass) {
    return (
      <GlassView
        pointerEvents="none"
        glassEffectStyle={variant}
        tintColor={tint}
        // The app has its own light/dark switch, so follow it rather than the system.
        colorScheme={dark ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.fallback,
        { borderRadius: radius },
        fallback
          ? null
          : {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.35)",
            },
      ]}
    >
      {fallback ?? (
        <BlurView
          intensity={dark ? 22 : 25}
          tint={dark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
