import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface MetricChartProps {
  chartType: string;
  data: Array<{ record_date: string; value: number; series_name?: string }>;
  unit?: string;
}

export function MetricChart({ chartType, data }: MetricChartProps) {
  // 시리즈(컬럼) 목록 추출
  const seriesNames = Array.from(
    new Set(data.map((d) => d.series_name || '값'))
  );

  // 날짜별로 각 시리즈 값을 묶음
  const byDate: Record<string, any> = {};
  for (const d of data) {
    const date = d.record_date?.split('T')[0]?.slice(5) || d.record_date;
    if (!byDate[date]) byDate[date] = { date };
    byDate[date][d.series_name || '값'] = Number(d.value);
  }
  const chartData = Object.values(byDate);

  if (chartData.length === 0) {
    return <p className="text-xs text-gray-400 py-4 text-center">데이터가 없습니다</p>;
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
          {seriesNames.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s}
              stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'pie') {
    // 파이는 첫 시리즈만 표시
    const s0 = seriesNames[0];
    const pieData = chartData.map((d: any) => ({ date: d.date, value: d[s0] || 0 }));
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="date"
            cx="50%" cy="50%" outerRadius={70} label>
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const layout = chartType === 'horizontalBar' ? 'vertical' : 'horizontal';
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout={layout as any}>
        <CartesianGrid strokeDasharray="3 3" />
        {layout === 'vertical' ? (
          <><XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="date" tick={{ fontSize: 10 }} width={40} /></>
        ) : (
          <><XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} /></>
        )}
        <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
        {seriesNames.map((s, i) => (
          <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
