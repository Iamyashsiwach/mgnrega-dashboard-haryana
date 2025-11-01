'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getMonthName } from '@/lib/analytics';

interface TrendChartProps {
  data: Array<{
    month: number;
    year: number;
    value: number | null;
  }>;
  title: string;
  type?: 'line' | 'bar';
  color?: string;
  language?: 'en' | 'hi';
}

export default function TrendChart({
  data,
  title,
  type = 'line',
  color = '#16a34a',
  language = 'en',
}: TrendChartProps) {
  // Sort data by date and format for chart
  const chartData = [...data]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    })
    .map(item => ({
      name: `${getMonthName(item.month, language).slice(0, 3)} ${item.year % 100}`,
      value: item.value || 0,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-2 border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{payload[0].payload.name}</p>
          <p className="text-lg font-bold" style={{ color }}>
            {payload[0].value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl border-2 border-gray-200">
      <h3 className="text-lg md:text-xl font-bold mb-4">{title}</h3>
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={(value) => {
                  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
                  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={3}
                dot={{ fill: color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={(value) => {
                  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
                  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

