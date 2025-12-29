'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/format';

interface Sale {
  id: string;
  amount: number;
  currency: string;
  closerName: string;
  createdAt: string;
  status: string;
}

interface SalesChartProps {
  sales: Sale[];
  type?: 'area' | 'bar' | 'pie';
  height?: number;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export function SalesChart({ sales, type = 'area', height = 200 }: SalesChartProps) {
  // Agrupar ventas por día
  const dailyData = useMemo(() => {
    const grouped = new Map<string, { date: string; total: number; count: number }>();

    sales.forEach(sale => {
      const date = new Date(sale.createdAt).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
      });
      const existing = grouped.get(date) || { date, total: 0, count: 0 };
      existing.total += sale.amount;
      existing.count += 1;
      grouped.set(date, existing);
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      })
      .slice(-14); // Últimos 14 días
  }, [sales]);

  // Agrupar por closer para pie chart
  const closerData = useMemo(() => {
    const grouped = new Map<string, { name: string; total: number; count: number }>();

    sales.forEach(sale => {
      const existing = grouped.get(sale.closerName) || { name: sale.closerName, total: 0, count: 0 };
      existing.total += sale.amount;
      existing.count += 1;
      grouped.set(sale.closerName, existing);
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [sales]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1c] border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-white/60 mb-1">{label}</p>
          <p className="text-sm font-semibold text-emerald-400">
            {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.count && (
            <p className="text-xs text-white/40 mt-1">
              {payload[0].payload.count} ventas
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1c] border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-white/90 mb-1">{payload[0].name}</p>
          <p className="text-sm font-semibold text-emerald-400">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {payload[0].payload.count} ventas
          </p>
        </div>
      );
    }
    return null;
  };

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={closerData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            dataKey="total"
            nameKey="name"
          >
            {closerData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            tickFormatter={(value) => formatNumber(value / 1000) + 'k'}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
          tickFormatter={(value) => formatNumber(value / 1000) + 'k'}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorTotal)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
