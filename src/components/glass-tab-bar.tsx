import { BlurView } from "expo-blur";
import type { Tabs } from "expo-router";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { TAB_BAR_HEIGHT, TAB_BAR_RADIUS, useTabBarBottom } from "@/components/tab-bar";
import { useTheme } from "@/theme/theme";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const RISE = 8; // how far the selected icon moves up to make room for its label

/**
 * Floating glass tab bar with "label reveal" switching (chosen in the tab-bar lab): a frosted
 * bar above the home indicator showing icons only; the selected tab's icon moves up, turns solid
 * crimson, and its name slides in underneath. The others stay centred with duotone icons.
 * Smooth timed movement, no bounce; instant under Reduce Motion. Badges (the Updates count) come
 * from each screen's `tabBarBadge` option and move with the icon.
 */
export function GlassTabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const dark = useColorScheme() === "dark";
  const bottom = useTabBarBottom();

  return (
    // Outer view: position and shadow; the glass is clipped to the rounded shape in its own layer.
    <View style={[styles.bar, { bottom }]} pointerEvents="box-none">
      <View
        style={[styles.glass, { borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.35)" }]}
        pointerEvents="none"
      >
        <BlurView
          // Ultra-thin material at a light intensity: more of the screen shows through the bar.
          intensity={dark ? 22 : 25}
          tint={dark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.row} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          const focused = state.index === index;
          const label = typeof options.title === "string" ? options.title : route.name;

          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <TabButton
              key={route.key}
              focused={focused}
              label={label}
              badge={options.tabBarBadge}
              renderIcon={(color) => options.tabBarIcon?.({ focused, color, size: 23 })}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  focused,
  label,
  badge,
  renderIcon,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  badge: string | number | undefined;
  renderIcon: (color: string) => ReactNode;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  // 0 = icon centred, label hidden; 1 = icon raised, label shown.
  const lift = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    const to = focused ? 1 : 0;
    lift.set(reduceMotion ? to : withTiming(to, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [focused, reduceMotion, lift]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -RISE * lift.value }] }));
  // The label fades in while sliding up from just below its spot.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ translateY: 5 * (1 - lift.value) }],
  }));
  const color = focused ? t.accentText : t.textMuted;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge !== undefined ? `${label}, ${badge} new` : label}
      style={styles.tab}
    >
      <Animated.View style={[styles.icon, iconStyle]}>
        {renderIcon(color)}
        {badge !== undefined ? (
          <View style={[styles.badge, { backgroundColor: t.accent, borderColor: t.card }]}>
            <Text style={[styles.badgeText, { color: t.onAccent }]}>{badge}</Text>
          </View>
        ) : null}
      </Animated.View>
      <Animated.Text style={[styles.label, { color }, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_RADIUS,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  glass: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: TAB_BAR_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: { flex: 1, flexDirection: "row", paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  icon: { width: 44, height: 26, alignItems: "center", justifyContent: "center" },
  label: { position: "absolute", bottom: 8, fontSize: 11, fontWeight: "700" },
  badge: {
    position: "absolute",
    top: -4,
    right: 4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
});
