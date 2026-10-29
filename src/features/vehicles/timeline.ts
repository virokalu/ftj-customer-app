import type { DocumentType, TimelineStep, TimelineStepType, VehicleDetail } from "@/lib/api/schemas";

import { formatDate } from "./status";

// The app's wording per step. `label` from the API is the English fallback for unknown types.
// "Purchase confirmed" is the v2 relabel of AUCTION_BILL_PAID (still to confirm with FTJ).
const stepLabels: Record<Exclude<TimelineStepType, "UNKNOWN">, string> = {
  BOUGHT: "Purchased",
  AUCTION_BILL_PAID: "Purchase confirmed",
  AT_EXPORT_YARD: "At export yard",
  EXPORT_CERT_ISSUED: "Export certificate issued",
  BOOKING_RECEIVED: "Booking received",
  SHIPPED: "Shipped",
  BL_ISSUED: "Bill of lading issued",
  ARRIVED: "Arrived",
  DELIVERED: "Delivered",
};

export function stepLabel(step: TimelineStep, vehicle?: Pick<VehicleDetail, "portOfDischarge">): string {
  if (step.type === "UNKNOWN") return step.label;
  if (step.type === "ARRIVED" && vehicle?.portOfDischarge) return `Arrived in ${vehicle.portOfDischarge}`;
  return stepLabels[step.type];
}

// The date line under a step: when it happened, or the planned date the API gave us for the
// two steps that have one. Nothing is invented for the others.
export function stepDate(step: TimelineStep, vehicle: Pick<VehicleDetail, "etd" | "eta">): string | null {
  if (step.completed) return formatDate(step.occurredAt);
  if (step.type === "SHIPPED" && vehicle.etd) return `Expected ${formatDate(vehicle.etd)}`;
  if (step.type === "ARRIVED" && vehicle.eta) return `Expected ${formatDate(vehicle.eta)}`;
  return null;
}

/** The first step, in order, that has not happened yet. */
export function nextStep(steps: TimelineStep[]): TimelineStep | null {
  return steps.find((s) => !s.completed) ?? null;
}

export const documentLabels: Record<DocumentType, { short: string; name: string }> = {
  LC: { short: "LC", name: "Letter of credit" },
  EC: { short: "EC", name: "Export Certificate" },
  ED: { short: "ED", name: "Export declaration" },
  BL: { short: "BL", name: "Bill of Lading" },
  INSPECTION_REPORT: { short: "IR", name: "Inspection report" },
  SHAKEN_SHO: { short: "SS", name: "Shaken-sho" },
  FREIGHT_INVOICE: { short: "FI", name: "Freight invoice" },
  PURCHASE_INVOICE: { short: "PI", name: "Purchase invoice" },
  SALES_INVOICE: { short: "SI", name: "Sales invoice" },
  MEGI_HENKO: { short: "MH", name: "Meigi henko" },
  CASH_RECEIPT: { short: "CR", name: "Cash receipt" },
  OTHER: { short: "DOC", name: "Document" },
};
