import { Tabs } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect } from "react";
import { StyleSheet, type ColorValue } from "react-native";

import { TAB_BAR_HEIGHT, TAB_BAR_RADIUS, useTabBarBottom } from "@/components/tab-bar";
import { fromServerTheme, setAppearance } from "@/features/account/appearance";
import { useAlerts, useMe } from "@/features/vehicles/hooks";
import { useTheme } from "@/theme/theme";

function tabIcon(name: SymbolViewProps["name"]) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={name} size={24} tintColor={color} />;
  };
}

// Tabs: Home, Vehicles, Stock, Updates (alerts, with the unread badge), Account. Messages
// open from the message icon in the Home header instead of a tab (changed from the v2 notes). No Documents tab: documents live
// on each vehicle's page. Stock is a placeholder until the API has customer stock routes
// (contract §11).
export default function TabsLayout() {
  const t = useTheme();
  const barBottom = useTabBarBottom();
  // The account's Appearance follows the customer to every device: once /me loads, its
  // `theme` wins over what this device remembered.
  const serverTheme = useMe().data?.theme;
  // Unread alerts for the Updates tab badge (the same cached query the Updates tab shows).
  const unread = useAlerts().data?.unreadCount ?? 0;
  useEffect(() => {
    if (serverTheme !== undefined) void setAppearance(fromServerTheme(serverTheme));
  }, [serverTheme]);
  return (
    <Tabs
      // The floating bar places itself above the home indicator, so no extra bottom padding.
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accentText,
        tabBarInactiveTintColor: t.textMuted,
        // Floating bar: a rounded card above the home indicator, inset from both sides.
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: barBottom,
          marginHorizontal: 16,
          height: TAB_BAR_HEIGHT,
          paddingTop: 6,
          paddingBottom: 6,
          borderRadius: TAB_BAR_RADIUS,
          backgroundColor: t.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.border,
          borderColor: t.border,
          shadowColor: "#000000",
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        tabBarItemStyle: { borderRadius: TAB_BAR_RADIUS - 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon({ ios: "house", android: "home", web: "home" }) }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: tabIcon({ ios: "car", android: "directions_car", web: "directions_car" }),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: tabIcon({ ios: "storefront", android: "storefront", web: "storefront" }),
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: "Updates",
          tabBarIcon: tabIcon({ ios: "bell", android: "notifications", web: "notifications" }),
          tabBarBadge: unread > 0 ? (unread > 9 ? "9+" : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: t.accent, color: t.onAccent, fontSize: 10, fontWeight: "700" },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: tabIcon({ ios: "person", android: "person", web: "person" }),
        }}
      />
    </Tabs>
  );
}
