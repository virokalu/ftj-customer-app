import { z } from "zod";

// These schemas ARE the app's copy of the API contract. Source of truth: doc/api/CUSTOMER_API.md
// (extracted from cargodev-api). Auth and /me match the real backend; vehicles and stock are
// NOT IMPLEMENTED there yet, so their shapes are still our best guess and only served by mocks.
// Rules baked in on purpose:
//  - A bought vehicle has NO price field at all (v2 change notes).
//  - A stock vehicle has an OPTIONAL price: the server omits the key unless showPrice is true.
//  - Nothing here knows about remarks, auction hall, bill-paid, costs or the activity log.
// The backend has no OpenAPI spec yet (CUSTOMER_API.md 1.2), so these are hand-written.

// Unknown statuses fall back to "UNKNOWN" instead of crashing the app when the backend
// adds a new status before the app is updated (forward compatibility).
// The backend's effective status is exactly these four; ARRIVED / DELIVERED are timeline
// milestones, not statuses (CUSTOMER_API.md 2.5).
export const vehicleStatus = z
  .enum(["PENDING", "BOOKING_RECEIVED", "SHIPPED", "CANCELLED", "UNKNOWN"])
  .catch("UNKNOWN");
export type VehicleStatus = z.infer<typeof vehicleStatus>;

export const vehicleSummary = z.object({
  id: z.string(),
  // Brand and model are optional relations in the backend, so both can be null.
  make: z.string().nullable(),
  model: z.string().nullable(),
  year: z.number().int().nullable(),
  chassisNo: z.string().nullable(),
  status: vehicleStatus,
  etd: z.string().nullable(), // ISO date
  eta: z.string().nullable(), // ISO date
  // TODO: the backend serves photos by id with the Bearer token (GET /photos/:id/image), not
  // by public URL. Replace with a photo id once the vehicle DTO is defined (open question 7).
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
  phone: z.string().nullable(),
  companyName: z.string().nullable(),
  country: z.string().nullable(),
  destinationPort: z.string().nullable(),
  language: z.string(),
  theme: z.enum(["light", "dark", "system"]).nullable(),
  memberSince: z.string(), // ISO datetime
});
export type Me = z.infer<typeof me>;

export const authTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokens>;

// What login and refresh return. Only the two tokens are stored; the rest is informational.
export const session = authTokens.extend({
  accessTokenExpiresIn: z.number(),
  refreshTokenExpiresAt: z.string(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string().nullable() }),
});
export type Session = z.infer<typeof session>;
