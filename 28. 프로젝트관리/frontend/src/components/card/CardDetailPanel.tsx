import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { SubtaskList } from './SubtaskList';
import { CardEditForm } from './CardEditForm';
import { CommentSection } from './CommentSection';
import { FileAttachment } from './FileAttachment';
import { WorkLogSection } from './WorkLogSection';
import { CardLinkSection } from './CardLinkSection';

interface CardDetailPanelProps {
  cardId: string;
  projectId: string;
  inline?: boolean;
  onClose?: () => void;
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    created: '님이 카드를 생성했습니다',
    column_moved: '님이 카드를 이동했습니다',
    transferred: '님이 업무를 이관했습니다',
    auto_transferred: '님이 완료하여 다음 담당자에게 전달되었습니다',
    completed: '님이 완료 처리했습니다',
    rejected: '님이 반려했습니다',
    workflow_completed: '님이 워크플로우를 완료했습니다',
    updated: '님이 카드를 수정했습니다',
  };
  return labels[type] || `님의 활동 (${type})`;
}

export function CardDetailPanel({ cardId, projectId, inline, onClose }: CardDetailPanelProps) {
  const setSelectedCard = useUiStore((s) => s.setSelectedCard);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showTransfer, setShowTransfer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [resType, setResType] = useState('completed');
  const [comment, setComment] = useState('');

  const { data: card } = useQuery<any>({
    queryKey: ['card', cardId],
    queryFn: () => apiClient(`/cards/${cardId}`),
  });

  const { data: board } = useQuery<any>({
    queryKey: ['board', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/board`),
  });

  const { data: transfers } = useQuery<any[]>({
    queryKey: ['transfers', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/transfers`),
  });

  const { data: timeline } = useQuery<any[]>({
    queryKey: ['timeline', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/timeline`),
  });

  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
  });

  // 프로젝트 멤버가 없으면 전체 사용자 목록 조회
  const { data: allUsers } = useQuery<any[]>({
    queryKey: ['all-users'],
    queryFn: () => apiClient('/auth/users'),
    enabled: !members || members.length <= 1,
  });

  const transferTargets = (members && members.length > 1)
    ? members
    : allUsers || [];

  const transferMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/cards/${cardId}/transfers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', cardId] });
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      setShowTransfer(false);
      setComment('');
    },
  });

  const moveToColumn = useMutation({
    mutationFn: (targetColumnId: string) =>
      apiClient(`/cards/${cardId}/move`, {
        method: 'PUT',
        body: JSON.stringify({ target_column_id: targetColumnId, position: 0 }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient(`/cards/${cardId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      setSelectedCard(null);
    },
  });

  const handleDelete = () => {
    if (window.confirm('이 카드를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) {
      deleteMutation.mutate();
    }
  };

  if (!card) return null;

  const panelContent = (
    <div className={inline
      ? 'h-full bg-white border rounded-lg overflow-y-auto'
      : 'bg-white rounded-lg w-[480px] max-h-[85vh] overflow-y-auto shadow-xl'}>
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold truncate">{card.title}</h2>
        <div className="flex gap-2">
          {card.status !== 'done' && (
            <button onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-blue-500 hover:text-blue-700">
              {isEditing ? '취소' : '수정'}
            </button>
          )}
          {card.created_by === currentUser?.id && card.status === 'todo' && (
            <button onClick={handleDelete}
              className="text-xs text-red-500 hover:text-red-700">삭제</button>
          )}
          <button onClick={() => { onClose ? onClose() : setSelectedCard(null); }}
            className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isEditing ? (
          <CardEditForm card={card} projectId={projectId}
            onClose={() => { setIsEditing(false); setSelectedCard(null); }} />
        ) : (
          <>
          <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 text-xs">우선순위</span>
            <p className="font-medium">{card.priority}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">마감일</span>
            <p className="font-medium">{card.due_date || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">상태</span>
            <select
              value={card.column_id}
              onChange={(e) => moveToColumn.mutate(e.target.value)}
              className="w-full border rounded px-1 py-0.5 text-xs mt-0.5
                font-medium cursor-pointer">
              {board?.columns?.map((col: any) => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-gray-500 text-xs">버전</span>
            <p className="font-medium">v{card.version}</p>
          </div>
        </div>

        {card.description && (
          <div>
            <span className="text-xs text-gray-500">설명</span>
            <div className="text-sm mt-1 rich-editor-content"
              dangerouslySetInnerHTML={{ __html: card.description }} />
          </div>
        )}

        {/* 하위 업무 */}
        <SubtaskList cardId={cardId} projectId={projectId} />

        {/* 첨부파일 */}
        <FileAttachment cardId={cardId} />

        {/* 작업 시간 로그 */}
        <WorkLogSection cardId={cardId} />

        {/* 연결된 이슈 */}
        <CardLinkSection cardId={cardId}
          projectCards={(board?.columns || []).flatMap((c: any) => c.cards || [])} />

        {/* 완료 처리 버튼 - 내 담당 업무만 */}
        {card.status !== 'done' && card.assignee_id === currentUser?.id && (
          <div className="space-y-2">
            <CompleteButton cardId={cardId} projectId={projectId} onClose={onClose} />
            <RejectButton cardId={cardId} projectId={projectId} />
          </div>
        )}
        {card.status === 'done' && (
          <p className="text-xs text-green-600 font-medium text-center
            py-2 bg-green-50 rounded">✓ 완료된 업무</p>
        )}

        {/* 이관 버튼 - 이미 이관된 카드는 재이관 불가 */}
        {(!transfers || transfers.length === 0) && (
          <button onClick={() => setShowTransfer(!showTransfer)}
            className="w-full py-2 bg-blue-500 text-white rounded-md text-sm
              hover:bg-blue-600">
            업무 이관하기
          </button>
        )}

        {/* 이관 폼 */}
        {showTransfer && (
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
            {(!transferTargets || transferTargets.length === 0) ? (
              <p className="text-xs text-gray-500">
                이관할 대상이 없습니다. 사용자를 먼저 등록하세요.
              </p>
            ) : (
            <>
            <div>
              <label className="text-xs font-medium">다음 담당자</label>
              <select value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm mt-1">
                <option value="">선택</option>
                {transferTargets.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">처리 결과</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {['approved', 'completed', 'rejected', 'hold'].map((t) => (
                  <button key={t} type="button"
                    onClick={() => setResType(t)}
                    className={`px-2 py-0.5 rounded text-xs border
                      ${resType === t ? 'bg-blue-500 text-white' : ''}`}>
                    {t === 'approved' ? '승인' : t === 'completed' ? '완료' :
                     t === 'rejected' ? '반려' : '보류'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">코멘트</label>
              <textarea value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm mt-1 h-16"
                placeholder="이관 사유" />
            </div>
            <button
              onClick={() => transferMutation.mutate({
                toUserId: transferTo,
                resolutionType: resType,
                comment,
              })}
              disabled={!transferTo}
              className="w-full py-1.5 bg-blue-500 text-white rounded text-xs
                disabled:opacity-50">
              이관 완료
            </button>
            </>
            )}
          </div>
        )}

        {/* 이관 이력 */}
        {transfers && transfers.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2">
              이관 이력
            </h3>
            <div className="space-y-2">
              {transfers.map((t: any) => (
                <div key={t.id}
                  className="border-l-2 border-blue-200 pl-2 py-1">
                  <p className="text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleString('ko-KR')}
                  </p>
                  <p className="text-sm">
                    {t.from_user_name} → {t.to_user_name}
                  </p>
                  <span className="text-xs bg-gray-100 px-1 rounded">
                    {t.resolution_type}
                  </span>
                  {t.comment && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {t.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 변경 이력 */}
        {timeline && timeline.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2">변경 이력</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {timeline.map((t: any) => (
                <div key={t.id} className="flex gap-2 text-xs">
                  <span className="text-gray-400 shrink-0">
                    {new Date(t.created_at).toLocaleString('ko-KR', {
                      month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <span className="text-gray-700">
                    <b>{t.actor_name || '시스템'}</b>{' '}
                    {eventLabel(t.event_type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 댓글 */}
        <CommentSection cardId={cardId} />
        </>
        )}
      </div>
    </div>
  );

  if (inline) return panelContent;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => { onClose ? onClose() : setSelectedCard(null); }}>
      <div onClick={(e) => e.stopPropagation()}>
        {panelContent}
      </div>
    </div>
  );
}

function CompleteButton({ cardId, projectId, onClose }: { cardId: string; projectId: string; onClose?: () => void }) {
  const [msg, setMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const queryClient = useQueryClient();
  const setSelectedCard = useUiStore((s) => s.setSelectedCard);

  const completeMutation = useMutation({
    mutationFn: () =>
      apiClient(`/cards/${cardId}/complete`, { method: 'POST' }),
    onSuccess: (data: any) => {
      setErrMsg('');
      setMsg(data.message);
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setTimeout(() => {
        if (onClose) onClose();
        setSelectedCard(null);
      }, 500);
    },
    onError: (err: any) => {
      setErrMsg(err.data?.message || '완료 처리에 실패했습니다');
    },
  });

  return (
    <div>
      <button onClick={() => completeMutation.mutate()}
        disabled={completeMutation.isPending}
        className="w-full py-2 bg-green-500 text-white rounded-md text-sm
          hover:bg-green-600 disabled:opacity-50">
        ✓ 완료 처리
      </button>
      {msg && (
        <p className="text-xs text-green-600 mt-1 text-center">{msg}</p>
      )}
      {errMsg && (
        <p className="text-xs text-red-500 mt-1 text-center">{errMsg}</p>
      )}
    </div>
  );
}

function RejectButton({ cardId, projectId }: { cardId: string; projectId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const queryClient = useQueryClient();
  const setSelectedCard = useUiStore((s) => s.setSelectedCard);

  const rejectMutation = useMutation({
    mutationFn: (data: { reason: string }) =>
      apiClient(`/cards/${cardId}/reject`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data: any) => {
      setMsg(data.message);
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setTimeout(() => setSelectedCard(null), 1500);
    },
  });

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)}
        className="w-full py-2 border border-red-300 text-red-600 rounded-md
          text-sm hover:bg-red-50">
        ↩ 수정 요청 (이전 담당자에게 반려)
      </button>
    );
  }

  return (
    <div className="border border-red-200 rounded-lg p-3 bg-red-50 space-y-2">
      <p className="text-xs font-medium text-red-700">수정 요청 사유</p>
      <textarea value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="수정이 필요한 이유를 입력하세요"
        className="w-full border rounded px-2 py-1 text-sm h-16" />
      <div className="flex gap-2">
        <button onClick={() => reason && rejectMutation.mutate({ reason })}
          disabled={!reason.trim() || rejectMutation.isPending}
          className="px-3 py-1 bg-red-500 text-white rounded text-xs
            disabled:opacity-50">수정 요청</button>
        <button onClick={() => setShowForm(false)}
          className="px-3 py-1 border rounded text-xs">취소</button>
      </div>
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}
