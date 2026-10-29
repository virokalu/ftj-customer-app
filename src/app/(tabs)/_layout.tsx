import { Tabs } from "expo-router";

import { useTheme } from "@/theme/theme";

// Tab set follows the v2 change notes: Messages is a tab (decision 1, still to be
// confirmed with FTJ); Alerts will be a bell on Home. No Documents tab: documents live
// on each vehicle's page.
// TODO: tab icons (add expo-symbols, then tabBarIcon).
export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.background, borderTopColor: t.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="vehicles" options={{ title: "Vehicles" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
