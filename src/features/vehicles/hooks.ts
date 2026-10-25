import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/endpoints";

// Query keys are arrays; the first item names the data. Keeping them in one place avoids
// typos when we later invalidate or refetch ("vehicles" everywhere).
export const queryKeys = {
  me: ["me"] as const,
  vehicles: ["vehicles"] as const,
  stock: ["stock"] as const,
};

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: api.me });
export const useVehicles = () => useQuery({ queryKey: queryKeys.vehicles, queryFn: api.vehicles });
export const useStock = () => useQuery({ queryKey: queryKeys.stock, queryFn: api.stock });
