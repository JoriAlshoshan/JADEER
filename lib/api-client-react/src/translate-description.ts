/**
 * Manual (non-generated) hook for the translate-description endpoint.
 * Kept separate to avoid being wiped by orval re-runs.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from './custom-fetch';
import { getGetProjectQueryKey, getListProjectsQueryKey } from './generated/api';

interface TranslateDescriptionResult {
  ideaSummaryAr: string;
}

async function translateDescription(projectId: number): Promise<TranslateDescriptionResult> {
  return customFetch<TranslateDescriptionResult>(
    `/projects/${projectId}/translate-description`,
    { method: 'POST' }
  );
}

/**
 * Calls POST /projects/:projectId/translate-description.
 * On success, invalidates both the single-project and project-list queries
 * so all consumers immediately see the translated description.
 */
export function useTranslateDescription(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => translateDescription(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    },
  });
}
