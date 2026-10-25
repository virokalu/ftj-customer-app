# FTJ Customer App (Expo, iOS)

Customer mobile app for FTJ Exports, a client of the new CargoDev Node backend (`/customer/v1`).
Design sources: `design/customer-app-v2-change-notes.md` and `design/cargodev-final-system-design.md` (v1.2) in the project.

## Run it (Windows / PowerShell)

```powershell
npm install
Copy-Item .env.example .env
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone (the camera app opens it). Windows can't run the iOS simulator, so a real iPhone with Expo Go is the quickest loop.

**Demo login (mock backend):** any email + password `demo1234`.
Mocks are ON in development until the real API exists. Turn them off with `EXPO_PUBLIC_USE_MOCKS=false` in `.env`.

Useful commands: `npx tsc --noEmit` (typecheck), `npx expo lint` (set up ESLint the first time it asks), `npx expo-doctor` (checks dependency versions), `npx expo install <pkg>` (always use this instead of `npm install <pkg>` so versions match the SDK).

> Expo Go only contains Expo's bundled native modules. When you add a library with its own native code (or need push notifications), you'll need a **development build** (`eas build --profile development`).

## Structure

```
src/
  app/                    Routes only (Expo Router: file = screen)
    _layout.tsx           Providers + route guard (Stack.Protected)
    sign-in.tsx
    (tabs)/               Home, Vehicles, Stock, Messages, Account
    vehicle/[id].tsx
  features/
    auth/                 token-storage (Keychain), auth-context
    vehicles/             React Query hooks, status wording
  lib/
    config.ts             The only place that reads env vars
    api/
      client.ts           fetch wrapper: bearer token, single-flight refresh, zod parsing
      schemas.ts          zod DTOs = the app's copy of the API contract
      endpoints.ts        one function per endpoint
      mock.ts             fake backend for development
  components/ui.tsx       Small shared components
  theme/theme.ts          Colors (light/dark), spacing
```

Rule of thumb: **screens (`app/`) call hooks, hooks call `api`, `api` calls `client`.** Nothing skips a layer, so a backend change touches one file.

## Decisions made while scaffolding (confirm these)

| Decision | Why |
|---|---|
| Separate repo, Expo SDK 58, Expo Router, TypeScript strict | The backend is now a separate Node service, so the app is its own repo. |
| **Sign-in only**, no registration screens | Decided 19 Oct 2026: accounts are created on the FTJ website. The v1 design PDF still shows create-account steps; those screens are not built. |
| Tabs: Home, Vehicles, Stock, Messages, Account | v2 change notes decision 1 (Messages tab, alerts as a bell on Home). FTJ hasn't confirmed this yet. |
| TanStack Query for server data | Caching, loading and error states, refetch on pull-to-refresh. |
| zod validates every response | "Parse, don't trust" at the boundary; also documents the contract. |
| Tokens in `expo-secure-store` (Keychain) | Never AsyncStorage (plain text). |
| Mock backend behind a flag | Screens can be built before the backend exists. |
| Hand-written zod schemas for now | Replace with types generated from the backend's OpenAPI spec once it exists. |

## Security rules the code already follows

- No price field on vehicles the customer bought; stock `price` is optional and only shown if the server sent it. **No price filter or sort anywhere** (it would let people infer hidden prices).
- The app never decides what a customer may see; it only renders what the API returns.
- Same error message for wrong email and wrong password.
- Signing out clears the query cache so the next user never sees old data.

## Placeholders to replace

- `bundleIdentifier` in `app.json` (`com.example.ftjcustomer`) and the app icon/splash.
- `websiteUrl` in `src/lib/config.ts`.
- Crimson and neutral colors in `src/theme/theme.ts` (taken from the design sheets).
- Tab icons (add `expo-symbols`).

## Next steps (suggested order)

1. Agree the API contract with the backend developers (login, refresh, `/me`, `/vehicles`, `/stock`), then swap `schemas.ts` for generated types.
2. Vehicle page: gallery, status card, derived 7-step timeline, documents section (signed URLs).
3. Forgot-password sheet; account deletion (App Store requirement).
4. Messages (shared inbox), alerts bell, notification settings, push (needs a development build).
5. Presence heartbeat (`POST /presence/heartbeat` every ~2 min while foregrounded).
6. Dark/Light/Auto appearance setting, language, EAS build profiles (development, staging, production).

## Open questions (from the design docs, ask FTJ)

Languages at launch; final status list (Arrived / Delivered); whether Messages is a tab; stock price currency and meaning.
