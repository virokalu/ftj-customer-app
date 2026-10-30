import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { restoreAppearance, setAppearance } from "@/features/account/appearance";
import { clearDocumentCache } from "@/features/documents/open-document";
import { api } from "@/lib/api/endpoints";
import { setSessionExpiredHandler } from "@/lib/api/client";

import { clearTokens, loadTokens, saveTokens } from "./token-storage";

type AuthState = {
  /** true while we check the Keychain on app start (show a splash, not the sign-in screen). */
  isLoading: boolean;
  isSignedIn: boolean;
  /**
   * `beforeEnter` runs after the tokens are saved and before the app switches to the signed-in
   * screens, with the signed-in name, so Sign in can show "Welcome back" first.
   */
  signIn: (
    email: string,
    password: string,
    options?: { beforeEnter?: (user: { name: string }) => Promise<void> },
  ) => Promise<void>;
  signOut: () => Promise<void>;
  /** After the account was deleted: wipe everything locally, no API calls (the token is dead). */
  endDeletedSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // On launch: are there tokens in the Keychain? (Validity is checked lazily by the first
  // API call, which refreshes or signs out as needed.)
  // The saved Appearance (Auto/Light/Dark) is applied first so the app never flashes the wrong theme.
  useEffect(() => {
    void restoreAppearance();
    loadTokens()
      .then((tokens) => setIsSignedIn(tokens !== null))
      .finally(() => setIsLoading(false));
  }, []);

  const resetLocalSession = useCallback(() => {
    setIsSignedIn(false);
    // Drop cached data so the next user on this device never sees the previous user's vehicles,
    // photos or documents.
    queryClient.clear();
    void Image.clearDiskCache();
    void Image.clearMemoryCache();
    clearDocumentCache();
    // The theme belongs to the account; the next person on this device starts on "Auto".
    void setAppearance("system");
  }, [queryClient]);

  // The API client calls this when a refresh fails (token expired/revoked).
  useEffect(() => {
    setSessionExpiredHandler(resetLocalSession);
    return () => setSessionExpiredHandler(null);
  }, [resetLocalSession]);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      options?: { beforeEnter?: (user: { name: string }) => Promise<void> },
    ) => {
      const session = await api.login(email.trim().toLowerCase(), password);
      await saveTokens(session);
      await options?.beforeEnter?.(session.user);
      setIsSignedIn(true);
    },
    [],
  );

  const signOut = useCallback(async () => {
    // Best effort: tell the server to revoke the session, but sign out locally regardless.
    const tokens = await loadTokens();
    if (tokens) await api.logout(tokens.refreshToken).catch(() => undefined);
    await clearTokens();
    resetLocalSession();
  }, [resetLocalSession]);

  const endDeletedSession = useCallback(async () => {
    await clearTokens();
    resetLocalSession();
  }, [resetLocalSession]);

  const value = useMemo(
    () => ({ isLoading, isSignedIn, signIn, signOut, endDeletedSession }),
    [isLoading, isSignedIn, signIn, signOut, endDeletedSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
