import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "@/lib/api/endpoints";
import { setSessionExpiredHandler } from "@/lib/api/client";

import { clearTokens, loadTokens, saveTokens } from "./token-storage";

type AuthState = {
  /** true while we check the Keychain on app start (show a splash, not the sign-in screen). */
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // On launch: are there tokens in the Keychain? (Validity is checked lazily by the first
  // API call, which refreshes or signs out as needed.)
  useEffect(() => {
    loadTokens()
      .then((tokens) => setIsSignedIn(tokens !== null))
      .finally(() => setIsLoading(false));
  }, []);

  const resetLocalSession = useCallback(() => {
    setIsSignedIn(false);
    // Drop cached data so the next user on this device never sees the previous user's vehicles.
    queryClient.clear();
  }, [queryClient]);

  // The API client calls this when a refresh fails (token expired/revoked).
  useEffect(() => {
    setSessionExpiredHandler(resetLocalSession);
    return () => setSessionExpiredHandler(null);
  }, [resetLocalSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const tokens = await api.login(email.trim().toLowerCase(), password);
    await saveTokens(tokens);
    setIsSignedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    // Best effort: tell the server to revoke the session, but sign out locally regardless.
    await api.logout().catch(() => undefined);
    await clearTokens();
    resetLocalSession();
  }, [resetLocalSession]);

  const value = useMemo(
    () => ({ isLoading, isSignedIn, signIn, signOut }),
    [isLoading, isSignedIn, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
