import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface CashFlowChartsProps {
  stats: {
    dailyTrend: Array<{
      date: string;
      inflow: number;
      outflow: number;
      net: number;
    }>;
  } | null;
  forecast: {
    currentBalanceUsdCents: number;
    projection: Array<{
      day: number;
      date: string;
      projectedInflowCents: number;
      projectedOutflowCents: number;
      projectedBalanceUsdCents: number;
    }>;
  } | null;
  currencyBreakdown: Record<string, { totalCents: number; usdEquivalentCents: number; count: number }> | null;
}

export const CashFlowCharts: React.FC<CashFlowChartsProps> = ({
  stats,
  forecast: _forecast,
  currencyBreakdown,
}) => {
  // Format daily trend data for Recharts (convert cents to thousands of USD for neat chart scales)
  const chartData = (stats?.dailyTrend || []).map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    Inflow: Math.round(d.inflow / 100),
    Outflow: Math.round(d.outflow / 100),
    Net: Math.round(d.net / 100),
  }));

  const currencyBarData = currencyBreakdown
    ? Object.entries(currencyBreakdown).map(([curr, data]) => ({
        currency: curr,
        usdValue: Math.round(data.usdEquivalentCents / 100),
        count: data.count,
      }))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 30-Day Historical Inflow vs Outflow */}
      <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-slate-700/60 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Historical Cash Flow Trajectory
            </h3>
            <p className="text-xs text-slate-400">Daily Inflows vs Disbursements</p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
              Inflows
            </span>
            <span className="flex items-center text-rose-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5 inline-block"></span>
              Outflows
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="Inflow"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#inflowGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Outflow"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#outflowGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Collecting cash flow data...
            </div>
          )}
        </div>
      </div>

      {/* Currency Allocation Distribution */}
      <div className="glass-card rounded-2xl p-5 border border-slate-700/60 flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white tracking-wide">Global Currency Pool</h3>
          <p className="text-xs text-slate-400">Consolidated Holdings in USD Value</p>
        </div>

        <div className="h-64 w-full">
          {currencyBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={currencyBarData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                />
                <YAxis dataKey="currency" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'USD Equiv']}
                />
                <Bar dataKey="usdValue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Loading currency breakdown...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
