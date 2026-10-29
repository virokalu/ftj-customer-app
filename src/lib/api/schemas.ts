import { z } from "zod";

// These schemas ARE the app's copy of the API contract. Source of truth:
// docs/customer-app-integration.md (contract v1.0.0, generated from cargodev-api and guarded by
// its tests); how the app uses it is in docs/cargodev-api-integration.md.
// Rules baked in on purpose:
//  - A vehicle has NO price or amount field at all; the API never sends one (contract §4).
//  - Nothing here knows about remarks, auction hall, bill-paid, costs or the activity log.
//  - Unknown keys are ignored (zod strips them) and unknown enum values fall back, so a newer
//    server never crashes an older app (contract §13).

// The statuses a customer sees (contract §4). CANCELLED is never sent. Unknown values fall
// back to "UNKNOWN" instead of failing the whole response.
export const vehicleStatus = z
  .enum(["PENDING", "BOOKING_RECEIVED", "SHIPPED", "ARRIVED", "DELIVERED", "UNKNOWN"])
  .catch("UNKNOWN");
export type VehicleStatus = z.infer<typeof vehicleStatus>;

// Every field except id, serial, status and photoCount can be null. Dates are ISO strings;
// etd/eta are midnight UTC, so format them with timeZone "UTC".
export const vehicleSummary = z.object({
  id: z.string(),
  serial: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  grade: z.string().nullable(),
  year: z.number().int().nullable(),
  chassisNo: z.string().nullable(),
  destination: z.string().nullable(),
  status: vehicleStatus,
  purchaseDate: z.string().nullable(),
  etd: z.string().nullable(),
  eta: z.string().nullable(),
  portOfLoading: z.string().nullable(),
  portOfDischarge: z.string().nullable(),
  vesselName: z.string().nullable(),
  // Photos are served by id with the Bearer token (GET /photos/:id/image), never by URL.
  coverPhotoId: z.string().nullable(),
  photoCount: z.number().int(),
});
export type VehicleSummary = z.infer<typeof vehicleSummary>;

export const vehicleDetail = vehicleSummary.extend({
  voyageNo: z.string().nullable(),
  blNo: z.string().nullable(),
  shippingMethod: z.enum(["RORO", "CONTAINER"]).nullable().catch(null),
  containerNumber: z.string().nullable(),
});
export type VehicleDetail = z.infer<typeof vehicleDetail>;

// Lists are page-numbered: { rows, total, page, pageSize }.
export const vehicleListResponse = z.object({
  rows: z.array(vehicleSummary),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type VehicleList = z.infer<typeof vehicleListResponse>;

export const home = z.object({
  name: z.string(),
  activeCount: z.number().int(),
  deliveredCount: z.number().int(),
  // Soonest upcoming ETD among PENDING / BOOKING_RECEIVED vehicles, or null.
  nextDeparture: z
    .object({ vehicleId: z.string(), serial: z.string(), etd: z.string() })
    .nullable(),
  // Up to 3, newest purchase first. May be empty.
  recentVehicles: z.array(vehicleSummary),
});
export type Home = z.infer<typeof home>;

// Always exactly 9 steps, in order (contract §4.4). Steps can complete out of order: never
// infer an earlier step from a later one.
export const timelineStepType = z
  .enum([
    "BOUGHT",
    "AUCTION_BILL_PAID",
    "AT_EXPORT_YARD",
    "EXPORT_CERT_ISSUED",
    "BOOKING_RECEIVED",
    "SHIPPED",
    "BL_ISSUED",
    "ARRIVED",
    "DELIVERED",
    "UNKNOWN",
  ])
  .catch("UNKNOWN");
export type TimelineStepType = z.infer<typeof timelineStepType>;

export const timelineStep = z.object({
  type: timelineStepType,
  label: z.string(), // English fallback; the app uses its own wording per type
  completed: z.boolean(),
  occurredAt: z.string().nullable(),
});
export type TimelineStep = z.infer<typeof timelineStep>;
export const timeline = z.array(timelineStep);

// Released photos, oldest first. Bytes come from GET /photos/:id/image (contract §5.1).
export const photoList = z.array(z.object({ id: z.string(), createdAt: z.string() }));
export type Photo = z.infer<typeof photoList>[number];

export const documentType = z
  .enum([
    "LC",
    "EC",
    "ED",
    "BL",
    "INSPECTION_REPORT",
    "SHAKEN_SHO",
    "FREIGHT_INVOICE",
    "PURCHASE_INVOICE",
    "SALES_INVOICE",
    "MEGI_HENKO",
    "CASH_RECEIPT",
    "OTHER",
  ])
  .catch("OTHER");
export type DocumentType = z.infer<typeof documentType>;

export const vehicleDocument = z.object({
  id: z.string(),
  name: z.string(), // staff-entered plain text; never used as a file name
  type: documentType,
  createdAt: z.string(),
  vehicle: z.object({ id: z.string(), serial: z.string() }),
});
export type VehicleDocument = z.infer<typeof vehicleDocument>;

export const documentListResponse = z.object({
  rows: z.array(vehicleDocument),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

// Exactly two values: no amounts of any kind (contract §4.7).
export const purchaseHistory = z.object({
  deliveredCount: z.number().int(),
  customerSince: z.string(),
});
export type PurchaseHistory = z.infer<typeof purchaseHistory>;

// Alert types (contract §7.2). Unknown events fall back to "UNKNOWN": show title/body, open the list.
export const alertEvent = z
  .enum([
    "BOOKING_RECEIVED",
    "PHOTOS_ADDED",
    "DOCUMENTS_READY",
    "DEPARTURE_REMINDER",
    "NEW_STOCK",
    "CHAT_MESSAGE",
    "LINK_REQUEST_APPROVED",
    "LINK_REQUEST_REJECTED",
    "UNKNOWN",
  ])
  .catch("UNKNOWN");
export type AlertEvent = z.infer<typeof alertEvent>;

export const alert = z.object({
  id: z.string(),
  event: alertEvent,
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  // null when the customer may no longer see that vehicle.
  vehicleId: z.string().nullable(),
  createdAt: z.string(),
});
export type Alert = z.infer<typeof alert>;

// Newest first, grouped by UTC day. unreadCount is for the whole account (the bell badge).
export const alertsResponse = z.object({
  days: z.array(z.object({ date: z.string(), alerts: z.array(alert) })),
  unreadCount: z.number().int(),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type AlertsResponse = z.infer<typeof alertsResponse>;

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
