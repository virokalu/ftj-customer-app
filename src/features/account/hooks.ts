import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/vehicles/hooks";
import { api, type MeChanges, type PreferenceChanges } from "@/lib/api/endpoints";
import type { NotificationPreferences } from "@/lib/api/schemas";

const keys = {
  preferences: ["prefs"] as const,
  faqs: ["faqs"] as const,
};

/** PATCH /me returns the full profile, so the cache is set from the response (no refetch). */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: MeChanges) => api.updateMe(changes),
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.me, me);
      // The Home greeting shows the name too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
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
