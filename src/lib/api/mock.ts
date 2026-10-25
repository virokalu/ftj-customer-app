// Fake backend for development, so screens can be built before the real API exists.
// Same shape as the real endpoints; deleted from use by setting EXPO_PUBLIC_USE_MOCKS=false.
// Demo login: any email + password "demo1234".

type MockResponse = { status: number; data: unknown };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    if (password !== "demo1234") return { status: 401, data: { message: "Invalid email or password" } };
    return { status: 200, data: { accessToken: "mock-access", refreshToken: "mock-refresh" } };
  }
  if (path === "/auth/refresh" && method === "POST") {
    return { status: 200, data: { accessToken: "mock-access", refreshToken: "mock-refresh" } };
  }
  if (path === "/auth/logout" && method === "POST") return { status: 204, data: null };

  if (!accessToken) return { status: 401, data: { message: "Unauthorized" } };

  if (path === "/me") {
    return { status: 200, data: { id: "c1", name: "Demo Customer", email: "demo@example.com", companyName: "Demo Motors Ltd" } };
  }
  if (path === "/vehicles") return { status: 200, data: { items: vehicles } };
  if (path === "/stock") return { status: 200, data: { items: stock } };

  return { status: 404, data: { message: "Not found" } };
}
