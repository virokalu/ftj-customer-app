import { ActivityIndicator, FlatList } from "react-native";

import { AppText, Card, Screen, Title } from "@/components/ui";
import { useStock } from "@/features/vehicles/hooks";
import { spacing, useTheme } from "@/theme/theme";

export default function StockScreen() {
  const t = useTheme();
  const { data, isPending, isError, refetch } = useStock();

  return (
    <Screen>
      <Title>Stock</Title>
      {isPending ? (
        <ActivityIndicator color={t.accent} />
      ) : isError ? (
        <AppText style={{ color: t.danger }} onPress={() => refetch()}>
          Couldn't load stock. Tap to retry.
        </AppText>
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <Card>
              <AppText style={{ fontWeight: "600" }}>
                {item.year} {item.make} {item.model}
              </AppText>
              {/* The server only sends `price` when staff allowed it. We show what we get;
                  we do not decide visibility here. */}
              <AppText muted>
                {item.price ? `${item.price.currency} ${item.price.amount.toLocaleString()}` : "Price on request"}
              </AppText>
            </Card>
          )}
        />
      )}
      {/* TODO: filters (body type only; NO price filter or sort), "Just in" tag, save heart, enquiry/reserve message */}
    </Screen>
  );
}
