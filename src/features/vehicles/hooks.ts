import { useQuery } from "@tanstack/react-query";

import { api, type VehicleFilters } from "@/lib/api/endpoints";

// Query keys are arrays; the first item names the data. Keeping them in one place avoids
// typos when we later invalidate or refetch ("vehicles" everywhere).
export const queryKeys = {
  me: ["me"] as const,
  home: ["home"] as const,
  vehicles: (filters: VehicleFilters = {}) => ["vehicles", filters] as const,
  vehicle: (id: string) => ["vehicle", id] as const,
};

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: api.me });
export const useHome = () => useQuery({ queryKey: queryKeys.home, queryFn: api.home });
export const useVehicles = (filters: VehicleFilters = {}) =>
  useQuery({ queryKey: queryKeys.vehicles(filters), queryFn: () => api.vehicles(filters) });
export const useVehicle = (id: string) =>
  useQuery({ queryKey: queryKeys.vehicle(id), queryFn: () => api.vehicle(id) });
