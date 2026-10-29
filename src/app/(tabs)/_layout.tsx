import { Tabs } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect } from "react";
import type { ColorValue } from "react-native";

import { fromServerTheme, setAppearance } from "@/features/account/appearance";
import { useMe } from "@/features/vehicles/hooks";
import { useTheme } from "@/theme/theme";

function tabIcon(name: SymbolViewProps["name"]) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={name} size={24} tintColor={color} />;
  };
}

// Tab set follows the v2 change notes: Messages is a tab (decision 1, still to be
// confirmed with FTJ); Alerts are a bell on Home. No Documents tab: documents live
// on each vehicle's page. Stock is a placeholder until the API has customer stock routes
// (contract §11).
export default function TabsLayout() {
  const t = useTheme();
  // The account's Appearance follows the customer to every device: once /me loads, its
  // `theme` wins over what this device remembered.
  const serverTheme = useMe().data?.theme;
  useEffect(() => {
    if (serverTheme !== undefined) void setAppearance(fromServerTheme(serverTheme));
  }, [serverTheme]);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accentText,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
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
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: tabIcon({ ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }),
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
