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

interface GridRow { date: string; values: Record<string, string>; }

function MetricCard({ metric, cardId }: { metric: any; cardId: string }) {
  const [gridMode, setGridMode] = useState(false);
  const [columns, setGridColumns] = useState<string[]>(['값']);
  const [rows, setRows] = useState<GridRow[]>([]);
  const queryClient = useQueryClient();

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

  // 그리드 전체 저장
  const saveGrid = useMutation({
    mutationFn: () => apiClient(`/metrics/${metric.id}/grid`, {
      method: 'PUT', body: JSON.stringify({ rows }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', cardId] });
      setGridMode(false);
    },
  });

  function openGrid() {
    // 기존 값을 그리드로 변환
    const vals = metric.values || [];
    const cols = Array.from(new Set(vals.map((v: any) => v.series_name || '값'))) as string[];
    if (cols.length === 0) cols.push('값');
    const byDate: Record<string, GridRow> = {};
    for (const v of vals) {
      const d = v.record_date?.split('T')[0];
      if (!byDate[d]) byDate[d] = { date: d, values: {} };
      byDate[d].values[v.series_name || '값'] = String(v.value);
    }
    const rowList = Object.values(byDate);
    if (rowList.length === 0) {
      rowList.push({ date: new Date().toISOString().split('T')[0], values: {} });
    }
    setGridColumns(cols);
    setRows(rowList);
    setGridMode(true);
  }

  function addColumn() {
    const name = prompt('추가할 컬럼(항목) 이름:');
    if (name) setGridColumns([...columns, name]);
  }
  function addRow() {
    setRows([...rows, { date: new Date().toISOString().split('T')[0], values: {} }]);
  }
  function updateCell(ri: number, col: string, val: string) {
    const next = [...rows];
    next[ri] = { ...next[ri], values: { ...next[ri].values, [col]: val } };
    setRows(next);
  }
  function updateDate(ri: number, val: string) {
    const next = [...rows];
    next[ri] = { ...next[ri], date: val };
    setRows(next);
  }
  function removeRow(ri: number) {
    setRows(rows.filter((_, i) => i !== ri));
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
        <button onClick={openGrid}
          className="mt-2 px-2 py-1 border rounded text-xs w-full hover:bg-gray-50">
          📋 표 편집 (행/열 입력)
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="overflow-x-auto border rounded">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">날짜</th>
                  {columns.map((c) => (
                    <th key={c} className="border px-2 py-1">{c}</th>
                  ))}
                  <th className="border px-1 py-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    <td className="border p-0">
                      <input type="date" value={row.date}
                        onChange={(e) => updateDate(ri, e.target.value)}
                        className="w-full px-1 py-0.5 text-xs outline-none" />
                    </td>
                    {columns.map((c) => (
                      <td key={c} className="border p-0">
                        <input type="number" value={row.values[c] || ''}
                          onChange={(e) => updateCell(ri, c, e.target.value)}
                          className="w-full px-1 py-0.5 text-xs outline-none text-right"
                          step="any" />
                      </td>
                    ))}
                    <td className="border text-center">
                      <button onClick={() => removeRow(ri)}
                        className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={addRow}
              className="px-2 py-0.5 border rounded text-xs">+ 행 추가</button>
            <button onClick={addColumn}
              className="px-2 py-0.5 border rounded text-xs">+ 열(항목) 추가</button>
            <button onClick={() => saveGrid.mutate()}
              disabled={saveGrid.isPending}
              className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs ml-auto disabled:opacity-50">
              {saveGrid.isPending ? '저장 중...' : '저장'}
            </button>
            <button onClick={() => setGridMode(false)}
              className="px-2 py-0.5 border rounded text-xs">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
