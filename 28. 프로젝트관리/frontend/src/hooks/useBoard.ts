import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useBoard(projectId: string) {
  return useQuery({
    queryKey: ['board', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/board`),
    enabled: !!projectId,
  });
}

export function useMoveCard(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      cardId: string;
      target_column_id: string;
      position: number;
      transfer_to?: string;
      resolution?: { type: string; comment?: string };
    }) => {
      const { cardId, ...body } = data;
      return apiClient(`/cards/${cardId}/move`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    },
  });
}

export function useCreateCard(columnId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; priority?: string }) =>
      apiClient(`/columns/${columnId}/cards`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    },
  });
}
