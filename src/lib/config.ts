// One place that reads environment variables, so the rest of the app never touches
// process.env directly. EXPO_PUBLIC_* values are inlined at build time.

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl && !__DEV__) {
  // Fail loudly in release builds: a missing URL is a build mistake, not a runtime case.
  throw new Error("EXPO_PUBLIC_API_URL is not set");
}

export const config = {
  apiUrl: apiUrl ?? "http://localhost:4000/customer/v1",
  // The backend does not exist yet, so mocks are ON by default in development.
  // Set EXPO_PUBLIC_USE_MOCKS=false once the real API is running.
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS
    ? process.env.EXPO_PUBLIC_USE_MOCKS === "true"
    : __DEV__,
  websiteUrl: "https://example.com", // TODO: FTJ website URL (account creation lives there)
} as const;
