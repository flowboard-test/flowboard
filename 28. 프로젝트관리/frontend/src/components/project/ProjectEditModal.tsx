import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface ProjectEditModalProps {
  project: any;
  onClose: () => void;
}

export function ProjectEditModal({ project, onClose }: ProjectEditModalProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center
      justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">프로젝트 수정</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">프로젝트 이름</label>
            <input type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">설명</label>
            <textarea value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm h-20" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose}
              className="px-4 py-2 border rounded text-sm">취소</button>
            <button
              onClick={() => updateMutation.mutate({ name, description })}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm
                hover:bg-blue-600">저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}
