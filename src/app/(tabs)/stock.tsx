import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { Screen, Title } from "@/components/ui";
import { spacing, useTheme } from "@/theme/theme";

// Placeholder. Stock browsing is not built in the customer API yet (contract §11): there is no
// endpoint to list or open stock vehicles, and the app must not call the staff or public routes.
// Build this tab (sheet 4) once the API has customer stock routes.
export default function StockScreen() {
  const t = useTheme();
  return (
    <Screen>
      <Title>Stock</Title>
      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: t.accentSoft }]}>
          <SymbolView
            name={{ ios: "car.2", android: "garage", web: "garage" }}
            size={26}
            tintColor={t.accent}
          />
        </View>
        <Text style={[styles.heading, { color: t.text }]}>Stock is coming soon</Text>
        <Text style={[styles.body, { color: t.textMuted }]}>
          You&apos;ll be able to browse vehicles available from Japan here. We&apos;ll let you know when
          it&apos;s ready.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 18, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
