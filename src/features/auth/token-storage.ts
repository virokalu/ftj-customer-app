import * as SecureStore from "expo-secure-store";

import type { AuthTokens } from "@/lib/api/schemas";

// Tokens go in the iOS Keychain (via SecureStore), never AsyncStorage: AsyncStorage is
// plain text on disk. The access token is short-lived; the refresh token is rotated by
// the server on every use.

const ACCESS_KEY = "ftj.accessToken";
const REFRESH_KEY = "ftj.refreshToken";

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
