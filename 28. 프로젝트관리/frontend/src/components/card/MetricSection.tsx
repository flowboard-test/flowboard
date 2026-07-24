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
      <div className="flex gap-1 mt-2">
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
      </div>
    </div>
  );
}
