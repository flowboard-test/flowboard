import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient('/notifications'),
    refetchInterval: 30000, // 30초마다 폴링
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/notifications/${id}/read`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMyTasks(filter?: string) {
  return useQuery({
    queryKey: ['my-tasks', filter],
    queryFn: () =>
      apiClient('/my-tasks', {
        params: filter ? { filter } : undefined,
      }),
  });
}

export function useDashboard(projectId: string) {
  return useQuery({
    queryKey: ['dashboard', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/dashboard`),
    enabled: !!projectId,
  });
}
