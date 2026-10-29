import { Link } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView } from "react-native";

import { AppText, Card, Title } from "@/components/ui";
import { useHome } from "@/features/vehicles/hooks";
import { formatDate, statusLabel, vehicleTitle } from "@/features/vehicles/status";
import { spacing, useTheme } from "@/theme/theme";

// Data comes from one call, GET /home (contract §4.1).
export default function HomeScreen() {
  const t = useTheme();
  const { data, isPending, isError, refetch, isRefetching } = useHome();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <Title>{data ? `Hello, ${data.name}` : "Hello"}</Title>
      {isPending ? (
        <ActivityIndicator color={t.accent} />
      ) : isError ? (
        <AppText style={{ color: t.danger }} onPress={() => refetch()}>
          Couldn&apos;t load your dashboard. Tap to retry.
        </AppText>
      ) : (
        <>
          <Card>
            <AppText style={{ fontWeight: "600" }}>{data.activeCount} active</AppText>
            <AppText muted>{data.deliveredCount} delivered</AppText>
          </Card>
          {data.nextDeparture ? (
            <Card>
              <AppText muted>Next departure</AppText>
              <AppText style={{ fontWeight: "600" }}>
                {data.nextDeparture.serial} · {formatDate(data.nextDeparture.etd)}
              </AppText>
            </Card>
          ) : null}
          <AppText muted>Recent vehicles</AppText>
          {data.recentVehicles.length === 0 ? (
            <AppText muted>No vehicles yet.</AppText>
          ) : (
            data.recentVehicles.map((v) => (
              <Link key={v.id} href={{ pathname: "/vehicle/[id]", params: { id: v.id } }} asChild>
                <Pressable>
                  <Card>
                    <AppText style={{ fontWeight: "600" }}>{vehicleTitle(v)}</AppText>
                    <AppText muted>
                      {v.serial} · {statusLabel[v.status]}
                      {v.eta ? ` · ETA ${formatDate(v.eta)}` : ""}
                    </AppText>
                  </Card>
                </Pressable>
              </Link>
            ))
          )}
        </>
      )}
      {/* TODO: dashboard design (ship route card, alerts bell with unread badge, agent card) */}
    </ScrollView>
  );
}
