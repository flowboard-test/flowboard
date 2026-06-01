import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface WeeklyReportProps {
  projectId: string;
}

export function WeeklyReport({ projectId }: WeeklyReportProps) {
  const { data: report } = useQuery<any>({
    queryKey: ['weekly-report', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/weekly-report`),
  });

  if (!report) return null;

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">📋 주간 보고서</h3>
      <p className="text-xs text-gray-500 mb-2">
        {report.period_start} ~ {report.period_end}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-green-50 rounded p-2">
          <p className="text-lg font-bold text-green-600">
            {report.completed_count}
          </p>
          <p className="text-xs text-gray-500">완료</p>
        </div>
        <div className="bg-blue-50 rounded p-2">
          <p className="text-lg font-bold text-blue-600">
            {report.in_progress_count}
          </p>
          <p className="text-xs text-gray-500">진행중</p>
        </div>
        <div className="bg-red-50 rounded p-2">
          <p className="text-lg font-bold text-red-600">
            {report.overdue_count}
          </p>
          <p className="text-xs text-gray-500">지연</p>
        </div>
      </div>

      {report.completed_tasks?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-600 mb-1">
            이번 주 완료된 업무
          </p>
          <div className="space-y-0.5">
            {report.completed_tasks.map((t: any) => (
              <p key={t.id} className="text-xs text-gray-700 pl-2
                border-l-2 border-green-300">
                {t.title}
              </p>
            ))}
          </div>
        </div>
      )}

      {report.upcoming_tasks?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">
            다음 주 예정 업무
          </p>
          <div className="space-y-0.5">
            {report.upcoming_tasks.map((t: any) => (
              <p key={t.id} className="text-xs text-gray-700 pl-2
                border-l-2 border-blue-300">
                {t.title} ({t.due_date?.split('T')[0]})
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
