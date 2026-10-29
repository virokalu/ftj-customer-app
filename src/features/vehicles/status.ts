import type { VehicleStatus, VehicleSummary } from "@/lib/api/schemas";
import type { Theme } from "@/theme/theme";

// Customer-friendly wording for each status. The API sends codes; the app owns the words.
export const statusLabel: Record<VehicleStatus, string> = {
  PENDING: "Pending",
  BOOKING_RECEIVED: "Booking received",
  SHIPPED: "Shipped",
  ARRIVED: "Arrived",
  DELIVERED: "Delivered",
  UNKNOWN: "Status",
};

// Chip colours per status, as theme token names so dark mode follows automatically.
export function statusTone(status: VehicleStatus, t: Theme): { fg: string; bg: string } {
  switch (status) {
    case "PENDING":
      return { fg: t.warning, bg: t.warningSoft };
    case "BOOKING_RECEIVED":
      return { fg: t.info, bg: t.infoSoft };
    case "SHIPPED":
      return { fg: t.success, bg: t.successSoft };
    case "ARRIVED":
      return { fg: t.violet, bg: t.violetSoft };
    default:
      return { fg: t.textMuted, bg: t.surface };
  }
}

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

// Whole calendar days from today (UTC) to a midnight-UTC date. Negative = in the past.
export function daysUntil(iso: string, now = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(iso).getTime() - today) / 86_400_000);
}

function inDays(n: number, verb: string): string {
  if (n === 0) return `${verb} today`;
  if (n === 1) return `${verb} tomorrow`;
  return `${verb} in ${n} days`;
}

// The one line that answers "where is my car?" on cards. Only uses dates the API sent;
// a date in the past is never presented as a promise.
export function journeyLine(v: VehicleSummary, now = new Date()): string {
  switch (v.status) {
    case "PENDING":
      return "Preparing for export";
    case "BOOKING_RECEIVED": {
      const n = v.etd ? daysUntil(v.etd, now) : null;
      return n !== null && n >= 0 ? inDays(n, "Departs") : "Booked on a sailing";
    }
    case "SHIPPED": {
      const n = v.eta ? daysUntil(v.eta, now) : null;
      return n !== null && n >= 0 ? inDays(n, "Arrives") : "On the water";
    }
    case "ARRIVED":
      return v.portOfDischarge ? `Arrived in ${v.portOfDischarge}` : "Arrived";
    case "DELIVERED":
      return "Delivered";
    default:
      return "In progress";
  }
}

// Position of the ship marker on the port-to-port track, 0 (loading port) to 1 (destination).
// While at sea it moves with the calendar between ETD and ETA.
export function journeyProgress(v: VehicleSummary, now = new Date()): number {
  switch (v.status) {
    case "PENDING":
      return 0;
    case "BOOKING_RECEIVED":
      return 0.08;
    case "SHIPPED": {
      if (!v.etd || !v.eta) return 0.5;
      const start = new Date(v.etd).getTime();
      const span = new Date(v.eta).getTime() - start;
      if (span <= 0) return 0.5;
      return Math.min(0.92, Math.max(0.15, (now.getTime() - start) / span));
    }
    case "ARRIVED":
    case "DELIVERED":
      return 1;
    default:
      return 0;
  }
}
