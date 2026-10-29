import { z } from "zod";

import { request } from "./client";
import {
  alertsResponse,
  documentListResponse,
  home,
  me,
  photoList,
  purchaseHistory,
  session,
  timeline,
  vehicleDetail,
  vehicleListResponse,
  type VehicleStatus,
} from "./schemas";

// One function per endpoint. Screens call these through React Query hooks and never
// build URLs themselves, so when the backend changes a path, only this file changes.
// Paths are relative to config.apiUrl (/api/customer/v1). See docs/customer-app-integration.md.
export type VehicleFilters = {
  page?: number;
  pageSize?: number;
  status?: Exclude<VehicleStatus, "UNKNOWN">;
  brand?: string;
  sort?: "purchaseDate" | "arrival";
  dir?: "asc" | "desc";
};

// Query strings are strict on the server (an unknown or empty parameter is a 400), so only
// defined values are sent.
function query(params: Record<string, string | number | undefined>): string {
  const pairs = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== "",
  );
  if (pairs.length === 0) return "";
  return `?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}`;
}

export const api = {
  login: (email: string, password: string) =>
    request("/auth/login", session, { method: "POST", body: { email, password }, auth: false }),

  // The refresh token is the credential here: logout revokes that one session, no access token needed.
  logout: (refreshToken: string) =>
    request("/auth/logout", z.object({ loggedOut: z.literal(true) }), {
      method: "POST",
      body: { refreshToken },
      auth: false,
    }),

  me: () => request("/me", me),

  home: () => request("/home", home),

  vehicles: (filters: VehicleFilters = {}) => request(`/vehicles${query(filters)}`, vehicleListResponse),

  vehicle: (id: string) => request(`/vehicles/${encodeURIComponent(id)}`, vehicleDetail),

  timeline: (id: string) => request(`/vehicles/${encodeURIComponent(id)}/timeline`, timeline),

  photos: (id: string) => request(`/vehicles/${encodeURIComponent(id)}/photos`, photoList),

  documents: (vehicleId?: string) => request(`/documents${query({ vehicleId, pageSize: 50 })}`, documentListResponse),

  purchaseHistory: () => request("/purchase-history", purchaseHistory),

  // Always 202 whatever the serial (contract §6): the result arrives later as an alert.
  linkVehicle: (serial: string) =>
    request("/vehicles/link-requests", z.object({ accepted: z.literal(true) }), {
      method: "POST",
      body: { serial },
    }),

  alerts: (page = 1, pageSize = 20) => request(`/alerts${query({ page, pageSize })}`, alertsResponse),

  // Idempotent: unknown or already-read ids change nothing. Never auto-retried.
  markAlertsRead: (target: { ids: string[] } | { all: true }) =>
    request("/alerts/mark-read", z.object({ updated: z.number().int() }), { method: "POST", body: target }),
};
