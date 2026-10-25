import { useLocalSearchParams } from "expo-router";

import { AppText, Card, Screen } from "@/components/ui";
import { useVehicles } from "@/features/vehicles/hooks";
import { statusLabel } from "@/features/vehicles/status";

// Shell only. The real page has: photo gallery, status card, Overview / Timeline /
// Documents / Photos sections, "Message agent". It needs GET /vehicles/:id, /timeline, /photos.
export default function VehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useVehicles();
  const vehicle = data?.items.find((v) => v.id === id);

  return (
    <Screen>
      {vehicle ? (
        <Card>
          <AppText style={{ fontWeight: "700", fontSize: 20 }}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </AppText>
          <AppText muted>{statusLabel[vehicle.status]}</AppText>
          {vehicle.etd ? <AppText muted>ETD {vehicle.etd}</AppText> : null}
          {vehicle.eta ? <AppText muted>ETA {vehicle.eta}</AppText> : null}
        </Card>
      ) : (
        <AppText muted>Vehicle not found.</AppText>
      )}
    </Screen>
  );
}
