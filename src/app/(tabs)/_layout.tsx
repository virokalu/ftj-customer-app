import { Tabs } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue } from "react-native";

import { useTheme } from "@/theme/theme";

function tabIcon(name: SymbolViewProps["name"]) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={name} size={24} tintColor={color} />;
  };
}

// Tab set follows the v2 change notes: Messages is a tab (decision 1, still to be
// confirmed with FTJ); Alerts are a bell on Home. No Documents tab: documents live
// on each vehicle's page. No Stock tab: stock is not built in the API (contract §11).
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
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: tabIcon({ ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account", tabBarIcon: tabIcon({ ios: "person", android: "person", web: "person" }) }}
      />
    </Tabs>
  );
}
