import * as SecureStore from "expo-secure-store";

import { applyAppearance, type AppearancePreference } from "@/theme/theme";

// The Appearance choice is kept on the device too (not secret, just a preference), so the
// app opens in the right theme before /me has loaded. The server copy (`theme` on /me)
// carries it to the customer's other devices.

const KEY = "ftj.appearance";

export async function restoreAppearance(): Promise<AppearancePreference> {
  const stored = await SecureStore.getItemAsync(KEY).catch(() => null);
  const preference: AppearancePreference = stored === "light" || stored === "dark" ? stored : "system";
  applyAppearance(preference);
  return preference;
}

export async function setAppearance(preference: AppearancePreference): Promise<void> {
  applyAppearance(preference);
  if (preference === "system") await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
  else await SecureStore.setItemAsync(KEY, preference).catch(() => undefined);
}

/** The API's theme: null means "never chosen", which is the same as following the system. */
export function fromServerTheme(theme: "light" | "dark" | "system" | null): AppearancePreference {
  return theme ?? "system";
}
