'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TrendingUp, Wallet } from 'lucide-react';
import type { ArtistSettlement, PartnerSettlement } from '../types';

const formatCurrency = (value: number) =>
  `₩${value.toLocaleString('ko-KR')}`;

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

interface IncomeChartProps {
  settlements: ArtistSettlement[];
  partnerSettlements: PartnerSettlement[];
}

export function IncomeChart({ settlements, partnerSettlements }: IncomeChartProps) {
  const { monthlyData, projectData, totalAmount, thisMonthAmount } = useMemo(() => {
    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      monthKeys.push(format(startOfMonth(d), 'yyyy-MM'));
    }

    const monthlyMap: Record<string, number> = {};
    monthKeys.forEach((k) => (monthlyMap[k] = 0));

    settlements
      .filter((s) => s.status === 'paid')
      .forEach((s) => {
        const key = format(startOfMonth(new Date(s.occurred_at)), 'yyyy-MM');
        if (key in monthlyMap) {
          monthlyMap[key] += s.actual_amount ?? s.amount ?? 0;
        }
      });

    partnerSettlements
      .filter((ps) => ps.status === 'paid')
      .forEach((ps) => {
        const key = format(startOfMonth(new Date(ps.period_end)), 'yyyy-MM');
        if (key in monthlyMap) {
          monthlyMap[key] += ps.partner_amount ?? 0;
        }
      });

    const monthlyData = monthKeys.map((key) => ({
      month: format(new Date(key + '-01'), 'M월', { locale: ko }),
      amount: monthlyMap[key] ?? 0,
      full: key,
    }));

    const projectMap: Record<string, { name: string; amount: number }> = {};
    settlements
      .filter((s) => s.status === 'paid')
      .forEach((s) => {
        const name = s.projects?.name ?? '미지정';
        if (!projectMap[name]) projectMap[name] = { name, amount: 0 };
        projectMap[name].amount += s.actual_amount ?? s.amount ?? 0;
      });
    partnerSettlements
      .filter((ps) => ps.status === 'paid')
      .forEach((ps) => {
        ps.partner_settlement_projects?.forEach((proj) => {
          const name = proj.project?.name ?? `프로젝트 #${proj.project_id}`;
          if (!projectMap[name]) projectMap[name] = { name, amount: 0 };
          projectMap[name].amount += proj.partner_amount ?? 0;
        });
      });

    const projectData = Object.values(projectMap)
      .filter((p) => p.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const totalAmount = Object.values(monthlyMap).reduce((a, b) => a + b, 0);
    const thisMonthKey = format(startOfMonth(now), 'yyyy-MM');
    const thisMonthAmount = monthlyMap[thisMonthKey] ?? 0;

    return {
      monthlyData,
      projectData,
      totalAmount,
      thisMonthAmount,
    };
  }, [settlements, partnerSettlements]);

  if (monthlyData.every((d) => d.amount === 0) && projectData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">수입 통계</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
          정산 완료된 내역이 없어 차트를 표시할 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200">수입 통계</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" />
            최근 12개월 합계
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            이번 달 수령
          </p>
          <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mt-0.5">
            {formatCurrency(thisMonthAmount)}
          </p>
        </div>
      </div>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              className="text-slate-500 dark:text-slate-400"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => (v >= 10000 ? `${v / 10000}만` : String(v))}
              className="text-slate-500 dark:text-slate-400"
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), '수령액']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.full && format(new Date(payload[0].payload.full + '-01'), 'yyyy년 M월', { locale: ko })}
              contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} name="수령액" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {projectData.length > 0 && (
        <div className="h-64">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            프로젝트별 수입
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={projectData}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {projectData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
