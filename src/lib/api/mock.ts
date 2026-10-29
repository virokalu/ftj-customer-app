// Fake backend for development, so screens can be built before the real API exists.
// Mirrors cargodev-api (docs/cargodev-api-integration.md): successes are { data }, errors are
// { error: { code, message } }, with the same status codes. Turn off with EXPO_PUBLIC_USE_MOCKS=false.
// Demo login: any email + password "demo1234".

type MockResponse = { status: number; data: unknown };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ok = (data: unknown, status = 200): MockResponse => ({ status, data: { data } });
const fail = (status: number, code: string, message: string): MockResponse => ({
  status,
  data: { error: { code, message } },
});

const session = () => ({
  accessToken: "mock-access",
  accessTokenExpiresIn: 900,
  refreshToken: "mock-refresh",
  refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  user: { id: "c1", name: "Demo Customer", email: "demo@example.com" },
});

// FAKE data in the real shapes (contract §4). Values are made up.
const vehicle = (
  n: number,
  brand: string,
  model: string,
  status: string,
  etd: string | null,
  eta: string | null,
) => ({
  id: `ckfake0vehicle0000000000${n}`,
  serial: `FC10${20 + n}`,
  brand,
  model,
  grade: null,
  year: 2018 + n,
  chassisNo: `FAKE-CHASSIS-000${n}`,
  destination: "Sri Lanka",
  status,
  purchaseDate: `2026-09-0${n}T00:00:00.000Z`,
  etd,
  eta,
  portOfLoading: "Yokohama",
  portOfDischarge: "Colombo",
  vesselName: status === "SHIPPED" ? "Example Vessel" : null,
  coverPhotoId: null,
  photoCount: 0,
});

const booked = vehicle(2, "Nissan", "X-Trail", "BOOKING_RECEIVED", "2026-11-05T00:00:00.000Z", null);
const vehicles = [
  vehicle(3, "Toyota", "Hilux", "PENDING", null, null),
  booked,
  vehicle(
    1,
    "Toyota",
    "Land Cruiser Prado",
    "SHIPPED",
    "2026-10-12T00:00:00.000Z",
    "2026-11-20T00:00:00.000Z",
  ),
];

const detail = (v: (typeof vehicles)[number]) => ({
  ...v,
  voyageNo: null,
  blNo: null,
  shippingMethod: "RORO",
  containerNumber: null,
});

const stepTypes = [
  ["BOUGHT", "Bought"],
  ["AUCTION_BILL_PAID", "Auction bill paid"],
  ["AT_EXPORT_YARD", "At export yard"],
  ["EXPORT_CERT_ISSUED", "Export certificate issued"],
  ["BOOKING_RECEIVED", "Booking received"],
  ["SHIPPED", "Shipped"],
  ["BL_ISSUED", "Bill of lading issued"],
  ["ARRIVED", "Arrived"],
  ["DELIVERED", "Delivered"],
] as const;

// How many of the 9 steps are done for each status (fake data only).
const stepsDone: Record<string, number> = {
  PENDING: 2,
  BOOKING_RECEIVED: 5,
  SHIPPED: 7,
  ARRIVED: 8,
  DELIVERED: 9,
};

const timelineFor = (v: (typeof vehicles)[number]) =>
  stepTypes.map(([type, label], i) => {
    const completed = i < (stepsDone[v.status] ?? 0);
    return {
      type,
      label,
      completed,
      occurredAt: completed ? `2026-09-${String(10 + i * 2).padStart(2, "0")}T00:00:00.000Z` : null,
    };
  });

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const alerts = [
  {
    id: "ckfake0alert01",
    event: "DEPARTURE_REMINDER",
    title: "Departure reminder",
    body: `${booked.serial} is due to depart in 7 days.`,
    isRead: false,
    vehicleId: booked.id,
    createdAt: hoursAgo(4),
  },
  {
    id: "ckfake0alert02",
    event: "BOOKING_RECEIVED",
    title: "Booking received",
    body: `Your booking for ${booked.serial} has been received.`,
    isRead: false,
    vehicleId: booked.id,
    createdAt: hoursAgo(72),
  },
  {
    id: "ckfake0alert03",
    event: "CHAT_MESSAGE",
    title: "New message",
    body: "You have a new message from the CargoDev team.",
    isRead: true,
    vehicleId: null,
    createdAt: hoursAgo(120),
  },
];

const profile = {
  id: "c1",
  name: "Demo Customer",
  email: "demo@example.com",
  phone: null as string | null,
  companyName: "Demo Motors Ltd" as string | null,
  country: "Sri Lanka" as string | null,
  destinationPort: "Colombo" as string | null,
  language: "en",
  theme: null as "light" | "dark" | "system" | null,
  memberSince: "2026-10-01T09:00:00.000Z",
};

const preferences = {
  events: {
    BOOKING_RECEIVED: true,
    PHOTOS_ADDED: true,
    DOCUMENTS_READY: true,
    DEPARTURE_REMINDER: true,
    NEW_STOCK: true,
    CHAT_MESSAGE: true,
  },
  departureLeadDays: 7,
  pushEnabled: true,
  emailEnabled: true,
  whatsappEnabled: false,
};

const faqList = [
  {
    id: "ckfake0faq01",
    question: "How long does shipping take?",
    answer: "It depends on the route; see your vehicle's ETA.",
  },
  {
    id: "ckfake0faq02",
    question: "When do I get the bill of lading?",
    answer: "It is issued after your vehicle ships. We'll let you know when it is ready.",
  },
];

export async function mockRequest(
  path: string,
  method: string,
  body: unknown,
  accessToken: string | null,
): Promise<MockResponse> {
  await wait(300);
  const route = path.split("?")[0] ?? path;

  if (path === "/auth/login" && method === "POST") {
    const { password } = (body ?? {}) as { password?: string };
    if (password !== "demo1234") return fail(400, "VALIDATION", "Invalid email or password.");
    return ok(session());
  }
  if (path === "/auth/refresh" && method === "POST") return ok(session());
  if (path === "/auth/logout" && method === "POST") return ok({ loggedOut: true });

  if (!accessToken) return fail(401, "UNAUTHENTICATED", "Authentication required.");

  if (route === "/me" && method === "PATCH") {
    Object.assign(profile, body as object);
    return ok(profile);
  }
  if (route === "/me") return ok(profile);
  if (route === "/me/notification-preferences" && method === "PATCH") {
    const changes = (body ?? {}) as Partial<typeof preferences>;
    Object.assign(preferences, { ...changes, events: { ...preferences.events, ...changes.events } });
    return ok(preferences);
  }
  if (route === "/me/notification-preferences") return ok(preferences);
  if (route === "/help/faqs") return ok(faqList);
  if (route === "/auth/delete-account" && method === "POST") {
    const { password } = (body ?? {}) as { password?: string };
    if (password !== "demo1234") return fail(400, "VALIDATION", "Incorrect password.");
    return ok({ deleted: true });
  }
  if (route === "/home") {
    return ok({
      name: "Demo Customer",
      activeCount: 3,
      deliveredCount: 0,
      nextDeparture: { vehicleId: booked.id, serial: booked.serial, etd: booked.etd },
      recentVehicles: vehicles,
    });
  }
  if (route === "/alerts") {
    const days = new Map<string, typeof alerts>();
    for (const a of alerts)
      days.set(a.createdAt.slice(0, 10), [...(days.get(a.createdAt.slice(0, 10)) ?? []), a]);
    return ok({
      days: [...days].map(([date, list]) => ({ date, alerts: list })),
      unreadCount: alerts.filter((a) => !a.isRead).length,
      total: alerts.length,
      page: 1,
      pageSize: 20,
    });
  }
  if (route === "/alerts/mark-read" && method === "POST") {
    const { ids, all } = (body ?? {}) as { ids?: string[]; all?: boolean };
    let updated = 0;
    for (const a of alerts) {
      if (!a.isRead && (all || ids?.includes(a.id))) {
        a.isRead = true;
        updated++;
      }
    }
    return ok({ updated });
  }
  if (route === "/vehicles") return ok({ rows: vehicles, total: vehicles.length, page: 1, pageSize: 20 });
  if (route === "/vehicles/link-requests" && method === "POST") {
    const { serial } = (body ?? {}) as { serial?: string };
    if (
      !/^(FC|FL)\d{1,9}$/.test(
        String(serial ?? "")
          .trim()
          .toUpperCase(),
      )
    ) {
      return fail(400, "VALIDATION", "Enter a serial number such as FC1024.");
    }
    return ok({ accepted: true }, 202);
  }
  if (route.startsWith("/vehicles/")) {
    const [id = "", sub] = route.slice("/vehicles/".length).split("/");
    const v = vehicles.find((x) => x.id === decodeURIComponent(id));
    if (!v) return fail(404, "NOT_FOUND", "Vehicle not found.");
    if (sub === "timeline") return ok(timelineFor(v));
    // Mock mode has no image files, so no photo ids either ("Photos coming soon").
    if (sub === "photos") return ok([]);
    return ok(detail(v));
  }
  if (route === "/documents") {
    // The shipped vehicle's export certificate is ready; everything else is pending.
    const shipped = vehicles.find((x) => x.status === "SHIPPED");
    const rows =
      shipped && path.includes(shipped.id)
        ? [
            {
              id: "ckfake0doc01",
              name: `Export certificate ${shipped.serial}`,
              type: "EC",
              createdAt: "2026-09-22T09:00:00.000Z",
              vehicle: { id: shipped.id, serial: shipped.serial },
            },
          ]
        : [];
    return ok({ rows, total: rows.length, page: 1, pageSize: 50 });
  }
  if (route === "/purchase-history")
    return ok({ deliveredCount: 0, customerSince: "2026-10-01T09:00:00.000Z" });

  return fail(404, "NOT_FOUND", "Route not found.");
}
