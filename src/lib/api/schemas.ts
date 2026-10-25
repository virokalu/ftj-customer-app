import { z } from "zod";

// These schemas ARE the app's copy of the API contract (the DTOs from the design doc).
// Rules baked in on purpose:
//  - A bought vehicle has NO price field at all (v2 change notes).
//  - A stock vehicle has an OPTIONAL price: the server omits the key unless showPrice is true.
//  - Nothing here knows about remarks, auction hall, bill-paid, costs or the activity log.
// When the backend publishes its OpenAPI spec, replace this file with generated types.

// Unknown statuses fall back to "UNKNOWN" instead of crashing the app when the backend
// adds a new status before the app is updated (forward compatibility).
// TODO: confirm the full status list with the backend (ARRIVED / DELIVERED are open questions).
export const vehicleStatus = z
  .enum(["PENDING", "BOOKING_RECEIVED", "SHIPPED", "UNKNOWN"])
  .catch("UNKNOWN");
export type VehicleStatus = z.infer<typeof vehicleStatus>;

export const vehicleSummary = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int().nullable(),
  chassisNo: z.string().nullable(),
  status: vehicleStatus,
  etd: z.string().nullable(), // ISO date
  eta: z.string().nullable(), // ISO date
  thumbnailUrl: z.string().nullable(),
});
export type VehicleSummary = z.infer<typeof vehicleSummary>;

export const vehicleListResponse = z.object({
  items: z.array(vehicleSummary),
});

export const stockVehicle = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int().nullable(),
  thumbnailUrl: z.string().nullable(),
  // Present ONLY when the staff allowed it. Absent means "Price on request".
  price: z.object({ amount: z.number(), currency: z.string() }).optional(),
});
export type StockVehicle = z.infer<typeof stockVehicle>;

export const stockListResponse = z.object({
  items: z.array(stockVehicle),
});

export const me = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  companyName: z.string().nullable(),
});
export type Me = z.infer<typeof me>;

export const authTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokens>;
