import type { VehicleStatus } from "@/lib/api/schemas";

// Customer-friendly wording for each status. The API sends codes; the app owns the words.
export const statusLabel: Record<VehicleStatus, string> = {
  PENDING: "Being prepared",
  BOOKING_RECEIVED: "Booking received",
  SHIPPED: "On the way",
  CANCELLED: "Cancelled",
  UNKNOWN: "In progress",
};
