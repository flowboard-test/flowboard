import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useTransferHistory(cardId: string) {
  return useQuery({
    queryKey: ['transfers', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/transfers`),
    enabled: !!cardId,
  });
}

export function useCreateTransfer(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      toUserId: string;
      resolutionType: string;
      comment?: string;
    }) =>
      apiClient(`/cards/${cardId}/transfers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', cardId] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

export function useResolutionHistory(cardId: string) {
  return useQuery({
    queryKey: ['resolutions', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/resolutions`),
    enabled: !!cardId,
  });
}
