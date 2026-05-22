import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface SelectedUser {
  id: string;
  name: string;
  email: string;
}

interface OrgMemberPickerProps {
  onSelect: (users: SelectedUser[]) => void;
  onClose: () => void;
  excludeIds?: string[];
}

export function OrgMemberPicker({ onSelect, onClose, excludeIds = [] }: OrgMemberPickerProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'org' | 'search'>('org');
  const [selected, setSelected] = useState<SelectedUser[]>([]);

  const { data: orgTree } = useQuery<any>({
    queryKey: ['organization'],
    queryFn: () => apiClient('/auth/organization'),
    enabled: activeTab === 'org',
  });

  const { data: searchResults } = useQuery<any[]>({
    queryKey: ['org-search', search],
    queryFn: () => apiClient('/auth/organization/search', {
      params: { q: search },
    }),
    enabled: activeTab === 'search' && search.length >= 1,
  });

  function toggleUser(user: SelectedUser) {
    if (selected.some((s) => s.id === user.id)) {
      setSelected(selected.filter((s) => s.id !== user.id));
    } else {
      setSelected([...selected, user]);
    }
  }

  function handleConfirm() {
    onSelect(selected);
    onClose();
  }

  function isChecked(userId: string) {
    return selected.some((s) => s.id === userId);
  }

  function isExcluded(userId: string) {
    return excludeIds.includes(userId);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center
      justify-center z-50">
      <div className="bg-white rounded-lg w-96 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold">멤버 선택 (복수 가능)</h2>
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setActiveTab('org')}
              className={`px-3 py-1 rounded text-xs
                ${activeTab === 'org' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
              조직도
            </button>
            <button onClick={() => setActiveTab('search')}
              className={`px-3 py-1 rounded text-xs
                ${activeTab === 'search' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
              검색
            </button>
          </div>
          {activeTab === 'search' && (
            <input type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 이메일, 부서로 검색"
              className="w-full border rounded px-3 py-2 text-sm" />
          )}
        </div>

        {/* 선택된 멤버 표시 */}
        {selected.length > 0 && (
          <div className="px-4 py-2 border-b bg-blue-50">
            <p className="text-xs text-blue-700 mb-1">
              {selected.length}명 선택됨
            </p>
            <div className="flex flex-wrap gap-1">
              {selected.map((u) => (
                <span key={u.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5
                    bg-blue-100 rounded text-xs">
                  {u.name}
                  <button onClick={() => toggleUser(u)}
                    className="text-blue-500">✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {activeTab === 'org' && orgTree && (
            <div className="space-y-2">
              {orgTree.departments?.map((dept: any) => (
                <div key={dept.id}>
                  <p className="text-xs font-semibold text-gray-600 px-2 py-1
                    bg-gray-50 rounded">{dept.name}</p>
                  {dept.users?.map((user: any) => (
                    <UserRow key={user.id} user={user}
                      checked={isChecked(user.id)}
                      disabled={isExcluded(user.id)}
                      onToggle={toggleUser} />
                  ))}
                </div>
              ))}
              {orgTree.unassigned?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 px-2 py-1">
                    부서 미지정
                  </p>
                  {orgTree.unassigned.map((user: any) => (
                    <UserRow key={user.id} user={user}
                      checked={isChecked(user.id)}
                      disabled={isExcluded(user.id)}
                      onToggle={toggleUser} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && searchResults && (
            <div className="space-y-1">
              {searchResults.map((user: any) => (
                <UserRow key={user.id} user={user}
                  checked={isChecked(user.id)}
                  disabled={isExcluded(user.id)}
                  onToggle={toggleUser} />
              ))}
              {searchResults.length === 0 && search && (
                <p className="text-xs text-gray-500 text-center py-4">
                  검색 결과가 없습니다
                </p>
              )}
            </div>
          )}
        </div>

        {/* 확인 버튼 */}
        <div className="p-3 border-t flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 border rounded text-sm">취소</button>
          <button onClick={handleConfirm}
            disabled={selected.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm
              disabled:opacity-50 hover:bg-blue-600">
            {selected.length}명 추가
          </button>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, checked, disabled, onToggle }: {
  user: any;
  checked: boolean;
  disabled: boolean;
  onToggle: (u: any) => void;
}) {
  return (
    <button
      onClick={() => !disabled && onToggle(user)}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left
        ${disabled ? 'opacity-40' : 'hover:bg-blue-50 cursor-pointer'}
        ${checked ? 'bg-blue-50' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled}
        readOnly className="w-3.5 h-3.5 rounded" />
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center
        justify-center text-xs font-medium text-gray-600">
        {user.name?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {user.department || ''} {user.position || ''} · {user.email}
        </p>
      </div>
      {disabled && <span className="text-xs text-gray-400">추가됨</span>}
    </button>
  );
}
