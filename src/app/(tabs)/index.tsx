import { AppText, Card, Screen, Title } from "@/components/ui";
import { useMe, useVehicles } from "@/features/vehicles/hooks";
import { statusLabel } from "@/features/vehicles/status";
import { spacing } from "@/theme/theme";

export default function HomeScreen() {
  const me = useMe();
  const vehicles = useVehicles();
  const onTheWay = vehicles.data?.items.filter((v) => v.status === "SHIPPED") ?? [];

  return (
    <Screen>
      <Title>{me.data ? `Hello, ${me.data.name}` : "Hello"}</Title>
      <AppText muted style={{ marginBottom: spacing.sm }}>On the way</AppText>
      {onTheWay.length === 0 ? (
        <AppText muted>No vehicles are on the water right now.</AppText>
      ) : (
        onTheWay.map((v) => (
          <Card key={v.id}>
            <AppText style={{ fontWeight: "600" }}>
              {v.year} {v.make} {v.model}
            </AppText>
            <AppText muted>{statusLabel[v.status]}{v.eta ? ` · ETA ${v.eta}` : ""}</AppText>
          </Card>
        ))
      )}
      {/* TODO: swipeable cards with the ship route, new updates, bell (alerts), agent card */}
fff    </Screen>
  );
}
