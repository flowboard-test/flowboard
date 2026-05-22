import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { MyTasksList } from '@/components/my-tasks/MyTasksList';

export function MyTasksPage() {
  const { data: tasks, isLoading } = useQuery<any[]>({
    queryKey: ['my-tasks'],
    queryFn: () => apiClient('/my-tasks'),
  });

  if (isLoading) {
    return <div className="p-6 text-gray-500">로딩 중...</div>;
  }

  return <MyTasksList tasks={tasks || []} />;
}
