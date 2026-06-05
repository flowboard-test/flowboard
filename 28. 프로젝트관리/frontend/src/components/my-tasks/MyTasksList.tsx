import { useState } from 'react';
import { CardDetailPanel } from '../card/CardDetailPanel';

interface TaskCard {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  status: string;
  project_id?: string;
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
  const [selectedTask, setSelectedTask] = useState<TaskCard | null>(null);

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
            onClick={() => setSelectedTask(task)}
            className="bg-white border rounded-lg p-3 hover:shadow-md
              cursor-pointer transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full
                  ${task.priority === 'urgent' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-orange-400' :
                    task.priority === 'normal' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                <p className="font-medium text-sm">{task.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded
                  ${task.status === 'done' ? 'bg-green-100 text-green-700' :
                    task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'}`}>
                  {task.status === 'done' ? '완료' :
                   task.status === 'in_progress' ? '진행중' : '할일'}
                </span>
                {task.due_date && (
                  <span className="text-xs text-gray-500">
                    {task.due_date.split('T')[0]}
                  </span>
                )}
              </div>
            </div>
            {task.transfer_info && (
              <div className="mt-2 bg-blue-50 rounded p-2">
                <p className="text-xs text-blue-700">
                  ← {task.transfer_info.from_user_name} 이관
                </p>
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

      {selectedTask && selectedTask.project_id && (
        <CardDetailPanel
          cardId={selectedTask.id}
          projectId={selectedTask.project_id}
        />
      )}
    </div>
  );
}
