import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { api, type VehicleFilters } from "@/lib/api/endpoints";

// Query keys are arrays; the first item names the data. Keeping them in one place avoids
// typos when we later invalidate or refetch ("vehicles" everywhere).
export const queryKeys = {
  me: ["me"] as const,
  home: ["home"] as const,
  vehicles: (filters: VehicleFilters = {}) => ["vehicles", filters] as const,
  vehicle: (id: string) => ["vehicle", id] as const,
  timeline: (id: string) => ["timeline", id] as const,
  photos: (id: string) => ["photos", id] as const,
  documents: (vehicleId: string) => ["documents", { vehicleId }] as const,
  purchaseHistory: ["purchaseHistory"] as const,
  alerts: ["alerts"] as const,
};

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: api.me });
export const useHome = () => useQuery({ queryKey: queryKeys.home, queryFn: api.home });
export const useVehicles = (filters: VehicleFilters = {}) =>
  useQuery({ queryKey: queryKeys.vehicles(filters), queryFn: () => api.vehicles(filters) });
export const useVehicle = (id: string) =>
  useQuery({ queryKey: queryKeys.vehicle(id), queryFn: () => api.vehicle(id) });

export const useTimeline = (id: string) =>
  useQuery({ queryKey: queryKeys.timeline(id), queryFn: () => api.timeline(id) });
export const usePhotos = (id: string) =>
  useQuery({ queryKey: queryKeys.photos(id), queryFn: () => api.photos(id) });
export const useVehicleDocuments = (vehicleId: string) =>
  useQuery({
    queryKey: queryKeys.documents(vehicleId),
    queryFn: () => api.documents(vehicleId),
    select: (list) => list.rows,
  });
export const usePurchaseHistory = () =>
  useQuery({ queryKey: queryKeys.purchaseHistory, queryFn: api.purchaseHistory });

// The full, paged vehicle list (infinite scroll, 20 per page). Pages are de-duplicated by id
// when flattened, so a vehicle that shifts between pages is shown once.
const PAGE_SIZE = 20;
export const useVehicleList = (filters: Omit<VehicleFilters, "page" | "pageSize">) =>
  useInfiniteQuery({
    queryKey: [...queryKeys.vehicles(filters), "infinite"],
    queryFn: ({ pageParam }) => api.vehicles({ ...filters, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    select: (data) => {
      const seen = new Set<string>();
      return data.pages
        .flatMap((p) => p.rows)
        .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
    },
  });

// How many vehicles are in each not-yet-delivered status, for the chips on My vehicles. One
// tiny request per status (pageSize 1, only `total` is used).
export const activeStatuses = ["PENDING", "BOOKING_RECEIVED", "SHIPPED", "ARRIVED"] as const;
export function useStatusCounts() {
  return useQueries({
    queries: activeStatuses.map((status) => ({
      queryKey: queryKeys.vehicles({ status, pageSize: 1 }),
      queryFn: () => api.vehicles({ status, pageSize: 1 }),
      select: (list: { total: number }) => list.total,
    })),
    combine: (results) =>
      results.every((r) => r.data !== undefined)
        ? Object.fromEntries(activeStatuses.map((s, i) => [s, results[i]?.data ?? 0]))
        : null,
  });
}

export function useLinkVehicle() {
  return useMutation({ mutationFn: api.linkVehicle });
}

// Vehicles not yet delivered, soonest arrival first (no ETA last). One page is plenty for
// the Home carousel; "See all" opens the full list.
const onTheWayFilters: VehicleFilters = { sort: "arrival", dir: "asc", pageSize: 10 };
export const useOnTheWay = () =>
  useQuery({
    queryKey: queryKeys.vehicles(onTheWayFilters),
    queryFn: () => api.vehicles(onTheWayFilters),
    select: (list) => list.rows.filter((v) => v.status !== "DELIVERED"),
  });

// Alerts change often, so they are never considered fresh.
export const useAlerts = () =>
  useQuery({ queryKey: queryKeys.alerts, queryFn: () => api.alerts(), staleTime: 0 });

/**
 * Loads what Home shows (dashboard, "On the way" cards, alerts) into the cache, with the same
 * keys Home reads, so Home opens already filled in. Used by Sign in right after signing in.
 * Never throws: a failed part simply loads again on Home.
 */
export function prefetchHome(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.prefetchQuery({ queryKey: queryKeys.home, queryFn: api.home }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.vehicles(onTheWayFilters),
      queryFn: () => api.vehicles(onTheWayFilters),
    }),
    queryClient.prefetchQuery({ queryKey: queryKeys.alerts, queryFn: () => api.alerts() }),
  ]).then(() => undefined);
}

export function useMarkAlertsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markAlertsRead,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}
