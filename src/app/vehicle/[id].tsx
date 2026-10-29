import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";

import { AppText, Card, Screen } from "@/components/ui";
import { useVehicle } from "@/features/vehicles/hooks";
import { formatDate, statusLabel, vehicleTitle } from "@/features/vehicles/status";
import { ApiError } from "@/lib/api/client";
import { useTheme } from "@/theme/theme";

// Shell only. The real page has: photo gallery, status card, Overview / Timeline /
// Documents / Photos sections, "Message agent". Still needs /timeline, /photos, /documents.
export default function VehicleScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: vehicle, isPending, error, refetch } = useVehicle(id);

  if (isPending) return <Screen><ActivityIndicator color={t.accent} /></Screen>;

  if (error) {
    // 404 covers "not released yet" as well as "gone": the API does not say which (contract §4).
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Screen>
        <AppText muted onPress={notFound ? undefined : () => refetch()}>
          {notFound
            ? "This vehicle is being prepared or is no longer available."
            : "Couldn't load this vehicle. Tap to retry."}
        </AppText>
      </Screen>
    );
  }

  const etd = formatDate(vehicle.etd);
  const eta = formatDate(vehicle.eta);
  return (
    <Screen>
      <Card>
        <AppText style={{ fontWeight: "700", fontSize: 20 }}>{vehicleTitle(vehicle)}</AppText>
        <AppText muted>
          {vehicle.serial} · {statusLabel[vehicle.status]}
        </AppText>
        {etd ? <AppText muted>ETD {etd}</AppText> : null}
        {eta ? <AppText muted>ETA {eta}</AppText> : null}
        {vehicle.chassisNo ? <AppText muted>Chassis {vehicle.chassisNo}</AppText> : null}
      </Card>
    </Screen>
  );
}
