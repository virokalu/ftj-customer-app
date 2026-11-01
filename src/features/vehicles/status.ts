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
    case "BOOKING_RECEIVED":
      return { fg: t.statusBooked, bg: t.statusBookedBg };
    case "SHIPPED":
      return { fg: t.statusShipped, bg: t.statusShippedBg };
    case "ARRIVED":
      return { fg: t.statusArrived, bg: t.statusArrivedBg };
    case "DELIVERED":
      return { fg: t.statusDelivered, bg: t.statusDeliveredBg };
    default:
      return { fg: t.statusPending, bg: t.statusPendingBg }; // PENDING and unknown
  }
}

// How a vehicle is named to the customer. The FTJ serial (FC90091) is an internal reference and
// is never shown in the app's own text; make, model, year and grade describe the car instead.

/** "2019 Toyota Aqua", skipping whatever is null. */
export function vehicleTitle(v: Pick<VehicleSummary, "year" | "brand" | "model">): string {
  return [v.year, v.brand, v.model].filter(Boolean).join(" ") || "Your vehicle";
}

/** "Toyota Aqua": make and model. */
export function vehicleName(v: Pick<VehicleSummary, "brand" | "model">): string {
  return [v.brand, v.model].filter(Boolean).join(" ") || "Your vehicle";
}

/** "2019 · G": year and grade, for the line under the name. */
export function vehicleSpec(v: Pick<VehicleSummary, "year" | "grade">): string {
  return [v.year, v.grade].filter(Boolean).join(" · ");
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

/** Where the shipment is, for the marker on the port-to-port track: cargo, ship or tick. */
export type JourneyStage = "loading" | "sailing" | "arrived";

export function journeyStage(v: Pick<VehicleSummary, "status">): JourneyStage {
  switch (v.status) {
    case "SHIPPED":
      return "sailing";
    case "ARRIVED":
    case "DELIVERED":
      return "arrived";
    default:
      return "loading"; // PENDING, BOOKING_RECEIVED (and unknown): still on land in Japan
  }
}

// Position of the marker on the port-to-port track, 0 (loading port) to 1 (destination).
// Before departure (pending or booked) it stays on the loading port, so it never looks as if the
// car has left; at sea it moves with the calendar between ETD and ETA (15-92%); arrived = 1.
export function journeyProgress(v: VehicleSummary, now = new Date()): number {
  switch (v.status) {
    case "PENDING":
    case "BOOKING_RECEIVED":
      return 0;
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
