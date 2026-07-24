import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { MetricChart } from './MetricChart';

const chartTypes = [
  { key: 'bar', label: '세로막대' },
  { key: 'horizontalBar', label: '가로막대' },
  { key: 'line', label: '꺾은선' },
  { key: 'pie', label: '파이' },
];

export function MetricSection({ cardId }: { cardId: string }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const queryClient = useQueryClient();

  const { data: metrics } = useQuery<any[]>({
    queryKey: ['metrics', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/metrics`),
  });

  const createMetric = useMutation({
    mutationFn: () => apiClient(`/cards/${cardId}/metrics`, {
      method: 'POST',
      body: JSON.stringify({ name, unit, chart_type: 'bar' }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', cardId] });
      setName(''); setUnit(''); setShowNew(false);
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-medium text-gray-500">📊 데이터 차트</h3>
        <button onClick={() => setShowNew(!showNew)}
          className="text-xs text-blue-500">+ 지표 추가</button>
      </div>

      {showNew && (
        <div className="bg-gray-50 rounded p-2 space-y-2 mb-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="지표 이름 (예: 일일 매출)"
            className="w-full border rounded px-2 py-1 text-xs" />
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
            placeholder="단위 (예: 원, 명)"
            className="w-full border rounded px-2 py-1 text-xs" />
          <button onClick={() => name && createMetric.mutate()}
            disabled={!name}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-50">
            생성
          </button>
        </div>
      )}

      <div className="space-y-4">
        {metrics?.map((m: any) => (
          <MetricCard key={m.id} metric={m} cardId={cardId} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ metric, cardId }: { metric: any; cardId: string }) {
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [gridMode, setGridMode] = useState(false);
  const [gridText, setGridText] = useState('');
  const queryClient = useQueryClient();

  const addValue = useMutation({
    mutationFn: () => apiClient(`/metrics/${metric.id}/values`, {
      method: 'POST',
      body: JSON.stringify({ record_date: date, value: parseFloat(value) }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', cardId] });
      setValue('');
    },
  });

  const changeType = useMutation({
    mutationFn: (chart_type: string) => apiClient(`/metrics/${metric.id}`, {
      method: 'PUT', body: JSON.stringify({ chart_type }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metrics', cardId] }),
  });

  const deleteMetric = useMutation({
    mutationFn: () => apiClient(`/metrics/${metric.id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metrics', cardId] }),
  });

  // 엑셀 스타일 일괄 저장 (날짜<탭>값 형식 또는 날짜,값)
  const bulkSave = useMutation({
    mutationFn: async () => {
      const lines = gridText.trim().split('\n');
      for (const line of lines) {
        const parts = line.split(/[\t,]/).map((s) => s.trim());
        if (parts.length < 2) continue;
        const d = parts[0];
        const v = parseFloat(parts[1]);
        if (!d || isNaN(v)) continue;
        await apiClient(`/metrics/${metric.id}/values`, {
          method: 'POST',
          body: JSON.stringify({ record_date: d, value: v }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', cardId] });
      setGridText(''); setGridMode(false);
    },
  });

  function openGrid() {
    // 기존 값을 표 텍스트로 미리 채움
    const existing = (metric.values || [])
      .map((v: any) => `${v.record_date?.split('T')[0]}\t${v.value}`)
      .join('\n');
    setGridText(existing);
    setGridMode(true);
  }

  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">{metric.name}
          {metric.unit && <span className="text-xs text-gray-400"> ({metric.unit})</span>}
        </span>
        <button onClick={() => deleteMetric.mutate()}
          className="text-xs text-red-400 hover:text-red-600">삭제</button>
      </div>
      {/* 차트 유형 선택 */}
      <div className="flex gap-1 mb-2">
        {chartTypes.map((ct) => (
          <button key={ct.key} onClick={() => changeType.mutate(ct.key)}
            className={`px-2 py-0.5 rounded text-xs border
              ${metric.chart_type === ct.key ? 'bg-blue-500 text-white' : 'bg-white'}`}>
            {ct.label}
          </button>
        ))}
      </div>
      {/* 차트 */}
      <MetricChart chartType={metric.chart_type}
        data={metric.values || []} unit={metric.unit} />
      {/* 값 입력 */}
      {!gridMode ? (
        <div className="flex gap-1 mt-2 items-center">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border rounded px-1 py-0.5 text-xs" />
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="값" step="any"
            className="border rounded px-2 py-0.5 text-xs w-24" />
          <button onClick={() => value && addValue.mutate()}
            disabled={!value}
            className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs disabled:opacity-50">
            기록
          </button>
          <button onClick={openGrid}
            className="px-2 py-0.5 border rounded text-xs ml-auto">📋 표로 입력</button>
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">
            엑셀에서 복사한 데이터를 붙여넣으세요 (날짜[탭]값)
          </p>
          <div className="flex text-xs font-medium bg-gray-100 rounded-t px-2 py-1">
            <span className="flex-1">날짜 (YYYY-MM-DD)</span>
            <span className="w-24">값</span>
          </div>
          <textarea value={gridText}
            onChange={(e) => setGridText(e.target.value)}
            placeholder={"2026-07-24\t100\n2026-07-25\t200"}
            rows={6}
            className="w-full border rounded px-2 py-1 text-xs font-mono
              whitespace-pre" />
          <div className="flex gap-1">
            <button onClick={() => bulkSave.mutate()}
              disabled={bulkSave.isPending}
              className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs disabled:opacity-50">
              {bulkSave.isPending ? '저장 중...' : '일괄 저장'}
            </button>
            <button onClick={() => setGridMode(false)}
              className="px-2 py-0.5 border rounded text-xs">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
