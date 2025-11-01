'use client';

import { LucideIcon } from 'lucide-react';
import { formatIndianNumber } from '@/lib/analytics';

interface PerformanceCardProps {
  title: string;
  value: number | null;
  unit?: string;
  icon: LucideIcon;
  color?: 'green' | 'blue' | 'orange' | 'purple';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  tooltip?: string;
  isPercentage?: boolean;
}

const colorClasses = {
  green: 'bg-green-100 text-green-700 border-green-300',
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
  purple: 'bg-purple-100 text-purple-700 border-purple-300',
};

const trendIcons = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const trendColors = {
  up: 'text-green-600',
  down: 'text-red-600',
  stable: 'text-gray-600',
};

export default function PerformanceCard({
  title,
  value,
  unit,
  icon: Icon,
  color = 'blue',
  trend,
  trendValue,
  tooltip,
  isPercentage = false,
}: PerformanceCardProps) {
  const formattedValue = value !== null
    ? isPercentage
      ? `${value.toFixed(1)}%`
      : formatIndianNumber(value)
    : 'N/A';

  return (
    <div
      className={`p-4 md:p-6 rounded-xl border-2 ${colorClasses[color]} hover:shadow-lg transition-all cursor-pointer group`}
      title={tooltip}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-white bg-opacity-50">
          <Icon size={24} />
        </div>
        {trend && trendValue !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-bold ${trendColors[trend]}`}>
            <span className="text-xl">{trendIcons[trend]}</span>
            <span>{Math.abs(trendValue).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <h3 className="text-sm md:text-base font-semibold mb-2 opacity-80">
        {title}
      </h3>

      <div className="flex items-baseline gap-2">
        <p className="text-2xl md:text-3xl font-bold">
          {formattedValue}
        </p>
        {unit && !isPercentage && (
          <span className="text-sm opacity-70">{unit}</span>
        )}
      </div>

      {tooltip && (
        <p className="text-xs mt-2 opacity-0 group-hover:opacity-70 transition-opacity">
          {tooltip}
        </p>
      )}
    </div>
  );
}

