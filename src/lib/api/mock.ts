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
  vehicle(1, "Toyota", "Land Cruiser Prado", "SHIPPED", "2026-10-12T00:00:00.000Z", "2026-11-20T00:00:00.000Z"),
];

const detail = (v: (typeof vehicles)[number]) => ({
  ...v,
  voyageNo: null,
  blNo: null,
  shippingMethod: "RORO",
  containerNumber: null,
});

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

  if (route === "/me") {
    return ok({
      id: "c1",
      name: "Demo Customer",
      email: "demo@example.com",
      phone: null,
      companyName: "Demo Motors Ltd",
      country: "Sri Lanka",
      destinationPort: "Colombo",
      language: "en",
      theme: null,
      memberSince: "2026-10-01T09:00:00.000Z",
    });
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
  if (route === "/vehicles") return ok({ rows: vehicles, total: vehicles.length, page: 1, pageSize: 20 });
  if (route.startsWith("/vehicles/")) {
    const v = vehicles.find((x) => x.id === decodeURIComponent(route.slice("/vehicles/".length)));
    return v ? ok(detail(v)) : fail(404, "NOT_FOUND", "Vehicle not found.");
  }

  return fail(404, "NOT_FOUND", "Route not found.");
}
