import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useNavigate } from 'react-router-dom';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: results } = useQuery<any>({
    queryKey: ['search', query],
    queryFn: () => apiClient('/search', { params: { q: query } }),
    enabled: query.length >= 2,
  });

  return (
    <div className="relative">
      <input type="text" value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder="검색..."
        className="border rounded px-3 py-1 text-sm w-48
          focus:w-64 transition-all" />

      {isOpen && query.length >= 2 && results && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white
          border rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
          {results.projects?.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-medium text-gray-500 px-2">프로젝트</p>
              {results.projects.map((p: any) => (
                <button key={p.id}
                  onClick={() => { navigate(`/projects/${p.id}`); setIsOpen(false); }}
                  className="w-full text-left px-2 py-1 rounded
                    hover:bg-blue-50 text-sm">{p.name}</button>
              ))}
            </div>
          )}
          {results.cards?.length > 0 && (
            <div className="p-2 border-t">
              <p className="text-xs font-medium text-gray-500 px-2">업무</p>
              {results.cards.map((c: any) => (
                <div key={c.id}
                  className="px-2 py-1 rounded hover:bg-blue-50 text-sm">
                  {c.title}
                  <span className="text-xs text-gray-400 ml-1">
                    ({c.priority})
                  </span>
                </div>
              ))}
            </div>
          )}
          {(!results.projects?.length && !results.cards?.length) && (
            <p className="p-3 text-sm text-gray-500 text-center">
              검색 결과가 없습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}
