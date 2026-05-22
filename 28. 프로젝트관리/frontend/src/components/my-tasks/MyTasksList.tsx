import { useState } from 'react';

interface TaskCard {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  status: string;
  transfer_info: {
    from_user_name: string;
    resolution_type: string;
    comment: string | null;
    created_at: string;
  } | null;
}

interface MyTasksListProps {
  tasks: TaskCard[];
}

export function MyTasksList({ tasks }: MyTasksListProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'overdue'>('all');

  const filtered = tasks.filter((t) => {
    if (filter === 'active') return t.status !== 'done';
    if (filter === 'done') return t.status === 'done';
    if (filter === 'overdue') {
      return t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
    }
    return true;
  });

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">내 업무</h2>
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'done', 'overdue'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs
              ${filter === f ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            {f === 'all' && '전체'}
            {f === 'active' && '진행중'}
            {f === 'done' && '완료'}
            {f === 'overdue' && '기한초과'}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((task) => (
          <div key={task.id}
            className="bg-white border rounded-lg p-3 hover:shadow-sm">
            <div className="flex justify-between items-start">
              <p className="font-medium text-sm">{task.title}</p>
              <span className="text-xs text-gray-500">{task.due_date}</span>
            </div>
            {task.transfer_info && (
              <div className="mt-2 bg-blue-50 rounded p-2">
                <p className="text-xs text-blue-700">
                  ← {task.transfer_info.from_user_name} 이관
                  ({task.transfer_info.resolution_type})
                </p>
                {task.transfer_info.comment && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    "{task.transfer_info.comment}"
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            표시할 업무가 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
