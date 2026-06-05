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
    <div className="p-4 h-full flex gap-4">
      {/* 좌측: 업무 목록 (좁게) */}
      <div className="w-80 shrink-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">내 업무</h2>
        <div className="flex gap-1 mb-3">
          {(['all', 'active', 'done', 'overdue'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded-full text-xs
                ${filter === f ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
              {f === 'all' ? '전체' : f === 'active' ? '진행중' :
               f === 'done' ? '완료' : '기한초과'}
            </button>
          ))}
        </div>
        <div className="space-y-2 overflow-y-auto flex-1">
          {filtered.map((task) => (
            <div key={task.id}
              onClick={() => setSelectedTask(task)}
              className={`border rounded-lg p-2.5 cursor-pointer transition-all
                ${selectedTask?.id === task.id
                  ? 'bg-blue-50 border-blue-300 shadow-sm'
                  : 'bg-white hover:shadow-sm'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0
                  ${task.priority === 'urgent' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-orange-400' :
                    task.priority === 'normal' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                <p className="text-xs font-medium truncate">{task.title}</p>
              </div>
              <div className="flex items-center gap-1 mt-1 ml-4">
                <span className={`text-[10px] px-1 py-0.5 rounded
                  ${task.status === 'done' ? 'bg-green-100 text-green-700' :
                    task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'}`}>
                  {task.status === 'done' ? '완료' :
                   task.status === 'in_progress' ? '진행중' : '할일'}
                </span>
                {task.due_date && (
                  <span className="text-[10px] text-gray-400">
                    {task.due_date.split('T')[0]}
                  </span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">
              표시할 업무가 없습니다
            </p>
          )}
        </div>
      </div>

      {/* 우측: 상세 패널 */}
      {selectedTask && selectedTask.project_id && (
        <div className="flex-1 overflow-hidden">
          <CardDetailPanel
            cardId={selectedTask.id}
            projectId={selectedTask.project_id}
            inline
          />
        </div>
      )}
      {!selectedTask && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          업무를 선택하면 상세 정보가 표시됩니다
        </div>
      )}
    </div>
  );
}
