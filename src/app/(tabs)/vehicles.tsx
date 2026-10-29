import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable } from "react-native";

import { AppText, Card, Screen, Title } from "@/components/ui";
import { useVehicles } from "@/features/vehicles/hooks";
import { statusLabel, vehicleTitle } from "@/features/vehicles/status";
import { spacing, useTheme } from "@/theme/theme";

export default function VehiclesScreen() {
  const t = useTheme();
  const { data, isPending, isError, refetch, isRefetching } = useVehicles();

  return (
    <Screen>
      <Title>My vehicles</Title>
      {isPending ? (
        <ActivityIndicator color={t.accent} />
      ) : isError ? (
        <AppText style={{ color: t.danger }} onPress={() => refetch()}>
          Couldn&apos;t load your vehicles. Tap to retry.
        </AppText>
      ) : (
        <FlatList
          data={data.rows}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={<AppText muted>No vehicles yet.</AppText>}
          renderItem={({ item }) => (
            <Link href={{ pathname: "/vehicle/[id]", params: { id: item.id } }} asChild>
              <Pressable>
                <Card>
                  <AppText style={{ fontWeight: "600" }}>{vehicleTitle(item)}</AppText>
                  <AppText muted>
                    {item.serial} · {statusLabel[item.status]}
                  </AppText>
                  {item.chassisNo ? <AppText muted>{item.chassisNo}</AppText> : null}
                </Card>
              </Pressable>
            </Link>
          )}
        />
      )}
      {/* TODO: infinite scroll (page 1 of 20 shown), filter/sort sheet (status, brand; NO price sort), purchase history */}
    </Screen>
  );
}
