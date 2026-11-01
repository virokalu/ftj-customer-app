import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/vehicles/hooks";
import { api, type MeChanges, type PreferenceChanges } from "@/lib/api/endpoints";
import type { Me, NotificationPreferences } from "@/lib/api/schemas";

const keys = {
  preferences: ["prefs"] as const,
  faqs: ["faqs"] as const,
};

// Every PATCH /me shares one key and one scope: they run one after another, in the order they
// were made, so an older save can never land after a newer one.
export const updateMeKey = ["updateMe"] as const;
const meScope = { id: "me" };

/** PATCH /me returns the full profile, so the cache is set from the response (no refetch). */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: updateMeKey,
    scope: meScope,
    mutationFn: (changes: MeChanges) => api.updateMe(changes),
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.me, me);
      // The Home greeting shows the name too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
    },
  });
}

/**
 * Appearance: shown and applied at once (the cached profile changes before the request is sent),
 * then saved to the account. Back to the previous choice if the save fails.
 */
export function useUpdateTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: updateMeKey,
    scope: meScope,
    mutationFn: (theme: NonNullable<Me["theme"]>) => api.updateMe({ theme }),
    onMutate: async (theme) => {
      // A profile load already on its way would bring back the old theme, so stop it.
      await queryClient.cancelQueries({ queryKey: queryKeys.me });
      const previous = queryClient.getQueryData<Me>(queryKeys.me);
      if (previous) queryClient.setQueryData<Me>(queryKeys.me, { ...previous, theme });
      return { previous };
    },
    onError: (_e, _theme, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.me, context.previous);
    },
    onSuccess: (me) => {
      // With a newer tap still waiting to be saved, keep showing that one instead.
      if (queryClient.isMutating({ mutationKey: updateMeKey }) <= 1) {
        queryClient.setQueryData(queryKeys.me, me);
      }
    },
  });
}

export const useNotificationPreferences = () =>
  useQuery({ queryKey: keys.preferences, queryFn: api.notificationPreferences });

/**
 * Each toggle saves immediately: the switch moves at once (optimistic) and moves back with an
 * error if the server refuses. PATCH is never retried automatically (guide §14).
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: PreferenceChanges) => api.updateNotificationPreferences(changes),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: keys.preferences });
      const previous = queryClient.getQueryData<NotificationPreferences>(keys.preferences);
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(keys.preferences, {
          ...previous,
          ...changes,
          events: { ...previous.events, ...changes.events },
        });
      }
      return { previous };
    },
    onError: (_e, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(keys.preferences, context.previous);
    },
    onSuccess: (prefs) => queryClient.setQueryData(keys.preferences, prefs),
  });
}

export const useFaqs = () => useQuery({ queryKey: keys.faqs, queryFn: api.faqs, staleTime: 5 * 60_000 });

export function useDeleteAccount() {
  return useMutation({ mutationFn: (password: string) => api.deleteAccount(password) });
}
