/**
 * Embed-aware rule mutator hook
 *
 * This hook provides the same interface as useRuleMutator but uses the embed API
 * endpoints instead of direct Supabase mutations. This allows the RuleEditorTable
 * to work in embed mode where users are authenticated via embed tokens.
 */

import { useMutation, useQueryClient } from "react-query";

/**
 * Mutator hook for embed mode that saves changes via the embed API
 *
 * @param {Object} options
 * @param {string} options.embedToken - The embed token for authentication
 * @param {string} options.apiBaseUrl - The base URL for API calls
 * @param {string} options.ruleId - The ID of the rule being edited
 * @param {Function} options.onRuleChange - Optional callback when rule changes
 * @returns {Object} - A mutation object compatible with useRuleMutator
 */
export function useEmbedRuleMutator({
  embedToken,
  apiBaseUrl,
  ruleId,
  onRuleChange,
}) {
  const queryClient = useQueryClient();
  const queryKey = ["embed-rule", { ruleId }];

  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`${apiBaseUrl}/api/embed/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Embed-Token": embedToken,
        },
        body: JSON.stringify({
          ruleId,
          updates: data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Save failed: ${response.status}`);
      }

      return response.json();
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const oldData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      if (oldData) {
        const newData = { ...oldData, ...data };
        queryClient.setQueryData(queryKey, newData);
      }

      // Notify parent component of the change
      onRuleChange?.(data);

      // Return context with the old data for rollback
      return { oldData };
    },
    onError: (_err, _data, context) => {
      // Rollback to previous value on error
      if (context?.oldData) {
        queryClient.setQueryData(queryKey, context.oldData);
      }
    },
    // Note: We don't invalidate queries here because in embed mode,
    // we rely purely on optimistic updates. The query's queryFn would
    // return stale data (ruleOverride), causing edits to revert.
  });
}

/**
 * Publish hook for embed mode that publishes via the embed API
 *
 * @param {Object} options
 * @param {string} options.embedToken - The embed token for authentication
 * @param {string} options.apiBaseUrl - The base URL for API calls
 * @param {string} options.ruleId - The ID of the rule being published
 * @param {Function} options.onSuccess - Callback on successful publish
 * @param {Function} options.onError - Callback on publish error
 * @returns {Object} - A mutation object for publishing
 */
export function useEmbedPublishMutator({
  embedToken,
  apiBaseUrl,
  ruleId,
  onSuccess,
  onError,
}) {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiBaseUrl}/api/embed/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Embed-Token": embedToken,
        },
        body: JSON.stringify({ ruleId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Publish failed: ${response.status}`
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    },
  });
}

