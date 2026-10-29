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

// /vehicles and /stock are NOT IMPLEMENTED in the backend yet; these shapes are our guess.
const vehicles = [
  {
    id: "v1",
    make: "Toyota",
    model: "Land Cruiser Prado",
    year: 2019,
    chassisNo: "GDJ150-0012345",
    status: "SHIPPED",
    etd: "2026-10-12",
    eta: "2026-11-20",
    thumbnailUrl: null,
  },
  {
    id: "v2",
    make: "Nissan",
    model: "X-Trail",
    year: 2018,
    chassisNo: "T32-0067890",
    status: "BOOKING_RECEIVED",
    etd: "2026-11-05",
    eta: null,
    thumbnailUrl: null,
  },
  {
    id: "v3",
    make: "Toyota",
    model: "Hilux",
    year: 2020,
    chassisNo: "GUN125-0034567",
    status: "PENDING",
    etd: null,
    eta: null,
    thumbnailUrl: null,
  },
];

const stock = [
  { id: "s1", make: "Toyota", model: "Vitz", year: 2017, thumbnailUrl: null, price: { amount: 5200, currency: "USD" } },
  // No `price` key at all: this car's showPrice is not true, so the server omits it.
  { id: "s2", make: "Honda", model: "Fit", year: 2016, thumbnailUrl: null },
];

export async function mockRequest(
  path: string,
  method: string,
  body: unknown,
  accessToken: string | null,
): Promise<MockResponse> {
  await wait(300);

  if (path === "/auth/login" && method === "POST") {
    const { password } = (body ?? {}) as { password?: string };
    if (password !== "demo1234") return fail(400, "VALIDATION", "Invalid email or password.");
    return ok(session());
  }
  if (path === "/auth/refresh" && method === "POST") return ok(session());
  if (path === "/auth/logout" && method === "POST") return ok({ loggedOut: true });

  if (!accessToken) return fail(401, "UNAUTHENTICATED", "Authentication required.");

  if (path === "/me") {
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
  if (path === "/vehicles") return ok({ items: vehicles });
  if (path === "/stock") return ok({ items: stock });

  return fail(404, "NOT_FOUND", "Route not found.");
}
