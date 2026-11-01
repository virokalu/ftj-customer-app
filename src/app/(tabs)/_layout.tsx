import { useIsMutating } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import type { ColorValue } from "react-native";

import { GlassTabBar } from "@/components/glass-tab-bar";
import { TabIcon, type TabIconName } from "@/components/tab-icons";
import { fromServerTheme, setAppearance } from "@/features/account/appearance";
import { updateMeKey } from "@/features/account/hooks";
import { useAlerts, useMe } from "@/features/vehicles/hooks";

// Duotone icon for a tab; GlassTabBar passes the colour (crimson when selected, grey otherwise).
function tabIcon(name: TabIconName) {
  return function Icon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <TabIcon name={name} focused={focused} color={String(color)} size={size} />;
  };
}

// Tabs: Home, Vehicles, Stock, Updates (alerts, with the unread badge), Account. Messages
// open from the message icon in the Home header instead of a tab (changed from the v2 notes). No Documents tab: documents live
// on each vehicle's page. Stock is a placeholder until the API has customer stock routes
// (contract §11).
export default function TabsLayout() {
  // The account's Appearance follows the customer to every device: once /me loads, its
  // `theme` wins over what this device remembered. This is the one place the theme is applied
  // from the account (the Appearance switch changes the cached /me at once). Skipped while a
  // profile save is on its way, so a reply in between can't switch the theme back and forth.
  const serverTheme = useMe().data?.theme;
  const saving = useIsMutating({ mutationKey: updateMeKey }) > 0;
  // Unread alerts for the Updates tab badge (the same cached query the Updates tab shows).
  const unread = useAlerts().data?.unreadCount ?? 0;
  useEffect(() => {
    if (serverTheme !== undefined && !saving) void setAppearance(fromServerTheme(serverTheme));
  }, [serverTheme, saving]);
  return (
    <Tabs
      // Floating glass bar with "label reveal" switching; it places itself above the home indicator.
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="vehicles" options={{ title: "Vehicles", tabBarIcon: tabIcon("vehicles") }} />
      <Tabs.Screen name="stock" options={{ title: "Stock", tabBarIcon: tabIcon("stock") }} />
      <Tabs.Screen
        name="updates"
        options={{
          title: "Updates",
          tabBarIcon: tabIcon("updates"),
          tabBarBadge: unread > 0 ? (unread > 9 ? "9+" : unread) : undefined,
        }}
      />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: tabIcon("account") }} />
    </Tabs>
  );
}
