import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

interface FileAttachmentProps {
  cardId: string;
}

export function FileAttachment({ cardId }: FileAttachmentProps) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  const { data: files } = useQuery<any[]>({
    queryKey: ['attachments', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/attachments`),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    await fetch(`/api/cards/${cardId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    queryClient.invalidateQueries({ queryKey: ['attachments', cardId] });
    e.target.value = '';
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-medium text-gray-500">
          첨부파일 ({files?.length || 0})
        </h3>
        <label className="text-xs text-blue-500 cursor-pointer">
          + 파일 추가
          <input type="file" onChange={handleUpload} className="hidden" />
        </label>
      </div>
      {files && files.length > 0 && (
        <div className="space-y-1">
          {files.map((f: any) => (
            <div key={f.id}
              className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
              <span className="text-xs">📎</span>
              <span className="text-xs flex-1 truncate">{f.file_name}</span>
              <span className="text-xs text-gray-400">
                {(f.file_size / 1024).toFixed(0)}KB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
