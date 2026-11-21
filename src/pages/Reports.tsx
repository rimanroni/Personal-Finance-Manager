import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useData } from '../context/DataContext';
import { accountStats, categoryTotals, monthlySeries, totals } from '../lib/finance';
import { money } from '../lib/format';
import { CategoryLegend, Donut, PageHeader, SectionTitle, Stat } from '../components/ui';

type Mode = 'Monthly' | 'Yearly' | 'Custom';

export function Reports() {
  const { accounts, transactions, categories, month } = useData();
  const [mode, setMode] = useState<Mode>('Monthly');

  const series = useMemo(() => {
    if (mode === 'Yearly') {
      const year = month.slice(0, 4);
      return Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, '0')}`;
        let income = 0, expense = 0;
        transactions.forEach((t) => { if (t.date.startsWith(key)) { if (t.type === 'income') income += t.amount; if (t.type === 'expense') expense += t.amount; } });
        return { key, label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i], income, expense, net: income - expense };
      });
    }
    if (mode === 'Custom') {
      let income = 0, expense = 0;
      transactions.forEach((t) => { if (t.date.startsWith(month)) { if (t.type === 'income') income += t.amount; if (t.type === 'expense') expense += t.amount; } });
      return [{ key: month, label: month.slice(5), income, expense, net: income - expense }];
    }
    return monthlySeries(transactions, month, 6);
  }, [transactions, month, mode]);

  const rangeKey = mode === 'Yearly' ? month.slice(0, 4) : month;
  const scoped = transactions.filter((t) => t.date.startsWith(rangeKey));
  const tt = totals(accounts, scoped, '');
  const cats = useMemo(() => categoryTotals(scoped, '', 'expense', categories), [scoped, categories]);
  const stats = useMemo(() => accountStats(accounts, transactions, ''), [accounts, transactions]);

  return (
    <div className="animate-fade">
      <PageHeader title="Reports" subtitle="Follow the money — in, out and where it went"
        right={
          <div className="segment">
            {(['Monthly', 'Yearly', 'Custom'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`seg ${mode === m ? 'on' : ''}`}>{m}</button>
            ))}
          </div>
        } />

      <div className="flex gap-2 mt-4">
        <Stat label="Money In" value={money(tt.income, true)} tone="income" />
        <Stat label="Money Out" value={money(tt.expense, true)} tone="expense" />
        <Stat label="Net" value={money(tt.remaining, true)} tone="primary" />
      </div>

      <SectionTitle title="Money In vs Money Out" />
      <div className="card">
        <div className="h-[190px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} barGap={3} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)} />
              <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 11 }} />
              <Bar dataKey="income" name="Money In" fill="var(--income)" radius={[5, 5, 2, 2]} maxBarSize={20} />
              <Bar dataKey="expense" name="Money Out" fill="var(--expense)" radius={[5, 5, 2, 2]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-3 tiny muted">
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm" style={{ background: 'var(--income)' }} />Money In</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm" style={{ background: 'var(--expense)' }} />Money Out</span>
        </div>
      </div>

      <SectionTitle title="Money Out by Category" />
      <div className="card">
        <div className="flex items-center gap-4">
          <Donut data={cats} size={110} />
          <CategoryLegend data={cats} />
        </div>
      </div>

      <SectionTitle title="Account Balances" />
      <div className="card !py-1">
        {accounts.map((a) => {
          const s = stats[a.id] || { balance: 0, in: 0, out: 0 };
          const pct = tt.balance ? (s.balance / tt.balance) * 100 : 0;
          return (
            <div key={a.id} className="py-2.5 border-b border-line last:border-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: a.color }}>{a.icon}</span>
                <div className="flex-1"><div className="text-[12px] font-semibold">{a.name}</div><div className="tiny muted">{a.type}</div></div>
                <div className="num text-[13px]">{money(s.balance)}</div>
              </div>
              <div className="h-1.5 rounded-full bg-appbg mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: 'var(--primary)' }} />
              </div>
            </div>
          );
        })}
      </div>

      <SectionTitle title="Net Trend" />
      <div className="card">
        <div className="h-[160px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)} />
              <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 11 }} />
              <Area type="monotone" dataKey="net" name="Net" stroke="var(--primary)" strokeWidth={2.5} fill="url(#netFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="tiny muted text-center mt-2">Net flow over {series.length} {series.length === 1 ? 'period' : 'periods'} · BDT</div>
      </div>
    </div>
  );
}
