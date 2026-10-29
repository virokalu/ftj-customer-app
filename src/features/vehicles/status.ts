import type { VehicleStatus, VehicleSummary } from "@/lib/api/schemas";

// Customer-friendly wording for each status. The API sends codes; the app owns the words.
export const statusLabel: Record<VehicleStatus, string> = {
  PENDING: "Being prepared",
  BOOKING_RECEIVED: "Booking received",
  SHIPPED: "On the way",
  ARRIVED: "Arrived",
  DELIVERED: "Delivered",
  UNKNOWN: "In progress",
};

// "2019 Toyota Aqua", skipping whatever is null; falls back to the serial.
export function vehicleTitle(v: Pick<VehicleSummary, "year" | "brand" | "model" | "serial">): string {
  return [v.year, v.brand, v.model].filter(Boolean).join(" ") || v.serial;
}

// etd/eta are midnight UTC, so format in UTC or the date shifts by a day in some time zones.
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
