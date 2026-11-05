import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BackButton, Centered } from "@/components/ui";
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
  const dark = useColorScheme() === "dark";

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

  // Pages with a header: the app's round glass back button (arrow only, no "Account" title), no
  // blurred fade under the header, and the header matches the page colour.
  const header = {
    headerShown: true,
    // See-through: these pages open from the tabs (no header of their own), and an opaque header
    // slid in and out with a white strip at its edge. Each page insets its content below it.
    headerTransparent: true,
    // The same 36 pt glass back button as the vehicle page, in place of the system one.
    headerBackVisible: false,
    headerLeft: () => <BackButton />,
    // iOS 26 puts its own glass capsule behind header buttons; ours already is glass, so hide it.
    unstable_headerLeftItems: () => [{ type: "custom" as const, element: <BackButton />, hidesSharedBackground: true }],
    headerTintColor: t.text,
    headerTitleStyle: { color: t.text },
    // Dark glass for the back button in dark mode (the header would otherwise stay light).
    headerUserInterfaceStyle: dark ? "dark" : "light",
    headerShadowVisible: false,
    scrollEdgeEffects: { top: "hidden" },
  } as const;

  // The navigator's own colours (what shows behind and around pages while they slide): the app's
  // page colour, not React Navigation's default light grey, which showed as a white strip around
  // the screen edge when going back in dark mode.
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.canvas, card: t.canvas, text: t.text, border: t.border, primary: t.accent },
  };

  // Route guards: Expo Router only registers the screens whose `guard` is true.
  // Signed out => only /welcome and /sign-in exist. Signed in => only the app screens exist.
  // Signing in flips the guard and the router moves the user to the app; signing out is
  // routed to Welcome by the effect above, and a signed-out cold start by `redirectTo`.
  return (
    <ThemeProvider value={navTheme}>
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
          <Stack.Screen name="messages" options={{ ...header, title: "Messages" }} />
          <Stack.Screen name="settings/details" options={{ ...header, title: "Personal details" }} />
          <Stack.Screen name="settings/notifications" options={{ ...header, title: "Notifications" }} />
          <Stack.Screen name="settings/help" options={{ ...header, title: "Help & FAQs" }} />
          <Stack.Screen name="settings/delete-account" options={{ ...header, title: "Delete account" }} />
          <Stack.Screen name="link-vehicle" options={{ ...header, title: "Link a vehicle" }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
