import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Centered } from "@/components/ui";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { useTheme } from "@/theme/theme";

export default function RootLayout() {
  // Created once per app run (useState initializer), not on every render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Don't retry validation/auth/permission/not-found/rate-limit errors: retrying cannot fix them.
            retry: (count, error) =>
              !(error instanceof ApiError && [400, 401, 403, 404, 429].includes(error.status)) && count < 2,
          },
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isLoading, isSignedIn } = useAuth();
  const t = useTheme();

  // After signing out (or the session expiring) always start again at Welcome. Without this the
  // router restores the signed-out history from before sign-in (Welcome -> Sign in) and the
  // customer lands on Sign in.
  const wasSignedIn = useRef(isSignedIn);
  useEffect(() => {
    if (wasSignedIn.current && !isSignedIn) router.dismissTo("/welcome");
    wasSignedIn.current = isSignedIn;
  }, [isSignedIn]);

  if (isLoading) {
    return (
      <Centered>
        <ActivityIndicator color={t.accent} />
      </Centered>
    );
  }

  // Route guards: Expo Router only registers the screens whose `guard` is true.
  // Signed out => only /welcome and /sign-in exist. Signed in => only the app screens exist.
  // Signing in flips the guard and the router moves the user to the app; signing out is
  // routed to Welcome by the effect above, and a signed-out cold start by `redirectTo`.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="welcome" />
        {/* Cross-fade: both screens share the same hero, so it seems to stay put while the
            route replays and the form replaces the welcome text. */}
        <Stack.Screen name="sign-in" options={{ animation: "fade" }} />
      </Stack.Protected>
      {/* The app opens at "/" (Home), which needs sign-in: send signed-out customers to Welcome,
          not to whichever signed-out screen the router would fall back to (it picked Sign in). */}
      <Stack.Protected guard={isSignedIn} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" />
        {/* The page draws its own back button over the gallery (sheet 3). */}
        <Stack.Screen name="vehicle/[id]" />
        <Stack.Screen
          name="alerts"
          options={{ headerShown: true, title: "Updates", headerBackTitle: "Home" }}
        />
        <Stack.Screen
          name="settings/details"
          options={{ headerShown: true, title: "Personal details", headerBackTitle: "Account" }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{ headerShown: true, title: "Notifications", headerBackTitle: "Account" }}
        />
        <Stack.Screen
          name="settings/help"
          options={{ headerShown: true, title: "Help & FAQs", headerBackTitle: "Account" }}
        />
        <Stack.Screen
          name="settings/delete-account"
          options={{ headerShown: true, title: "Delete account", headerBackTitle: "Account" }}
        />
        <Stack.Screen
          name="link-vehicle"
          options={{ headerShown: true, title: "Link a vehicle", presentation: "modal" }}
        />
      </Stack.Protected>
    </Stack>
  );
}
