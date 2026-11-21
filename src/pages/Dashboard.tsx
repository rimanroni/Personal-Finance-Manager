import { useMemo } from 'react';
import { BarChart3, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Bell, ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '../context/DataContext';
import { accountStats, categoryTotals, dailySeries, totals } from '../lib/finance';
import { daysUntil, money, shortDate } from '../lib/format';
import { localize } from '../lib/i18n';
import { reminderDaysLabel } from '../lib/notifications';
import { AnimatedMoney, Donut, CategoryLegend, EmptyState, MonthSwitcher, SectionTitle } from '../components/ui';
import { TxDayGroups } from '../components/TxRow';
import type { Transaction, TxType } from '../types';
import type { PageId } from '../components/Layout';

export function Dashboard({ onAdd, onEdit, onDelete, onNavigate }: {
  onAdd: (type: TxType) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onNavigate: (p: PageId) => void;
}) {
  const { accounts, transactions, categories, notes, month, settings, t, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  const tt = totals(accounts, transactions, month);
  const stats = useMemo(() => accountStats(accounts, transactions, month), [accounts, transactions, month]);
  const series = useMemo(() => dailySeries(transactions, 7), [transactions]);
  const cats = useMemo(() => categoryTotals(transactions, month, 'expense', categories), [transactions, month, categories]);
  const recent = useMemo(() => [...transactions].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 6), [transactions]);

  const reminders = useMemo(() => [
    ...transactions.filter((x) => x.reminderDate).map((x) => ({ id: x.id, due: x.reminderDate!, text: x.note || `${x.categoryId} · ${money(x.amount)}` })),
    ...notes.filter((x) => x.reminderDate).map((x) => ({ id: x.id, due: x.reminderDate!, text: x.text })),
  ].sort((a, b) => a.due.localeCompare(b.due)), [transactions, notes]);
  const nextReminder = reminders[0];

  const quick: { type: TxType; label: string; icon: typeof ArrowUpRight; bg: string; fg: string }[] = [
    { type: 'expense', label: t('expense'), icon: ArrowUpRight, bg: 'var(--expense-soft)', fg: 'var(--expense)' },
    { type: 'income', label: t('income'), icon: ArrowDownLeft, bg: 'var(--income-soft)', fg: 'var(--income)' },
    { type: 'transfer', label: t('transfer'), icon: ArrowLeftRight, bg: '#e9f0ff', fg: 'var(--blue)' },
  ];

  const handleQuick = (type: TxType) => {
    if (accounts.length === 0) onNavigate('accounts');
    else onAdd(type);
  };

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="tiny muted">{tx('Good day')}, {(settings.profileName || (lang === 'bn' ? 'বন্ধু' : 'there')).trim().split(/\s+/)[0]} 👋</div>
          <div className="h-title">{t('dashboard')}</div>
        </div>
        <div className="tiny muted hidden sm:block">{shortDate(new Date().toISOString().slice(0, 10))}</div>
      </div>

      <MonthSwitcher />

      <div className="balance-card mt-4">
        <div className="text-[10px] font-bold tracking-[.12em] uppercase opacity-85 display">{t('totalBalance')}</div>
        <AnimatedMoney value={tt.balance} className="num text-[32px] leading-tight mt-1" />
        <div className="text-[11px] opacity-85">{lang === 'bn' ? `${accounts.length} অ্যাকাউন্ট জুড়ে · এই ডিভাইসে` : `Across ${accounts.length} accounts · on this device`}</div>
        <div className="flex gap-6 mt-4 relative z-10">
          <div>
            <AnimatedMoney value={tt.income} compact className="num text-[13px]" />
            <div className="text-[10px] opacity-85">{t('moneyIn')}</div>
          </div>
          <div>
            <AnimatedMoney value={tt.expense} compact className="num text-[13px]" />
            <div className="text-[10px] opacity-85">{t('moneyOut')}</div>
          </div>
          <div>
            <AnimatedMoney value={tt.remaining} compact className="num text-[13px]" />
            <div className="text-[10px] opacity-85">{t('remaining')}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mt-4 stagger">
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <button key={q.type} onClick={() => handleQuick(q.type)} className="qbtn">
              <span className="qi" style={{ background: q.bg, color: q.fg }}><Icon /></span>
              <span>{q.label}</span>
            </button>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <div className="mt-3">
          <EmptyState
            icon="🌱"
            text={tx('No demo data here. Add your first account — only what you enter will ever be stored.')}
            actionLabel={tx('Add first account')}
            onAction={() => onNavigate('accounts')}
          />
          <button className="link text-[11px] block mx-auto mt-2" onClick={() => onNavigate('categories')}>
            {tx('Or add your own categories first →')}
          </button>
        </div>
      )}

      <button onClick={() => onNavigate('calendar')} className="w-full flex items-center gap-2.5 mt-3 rounded-2xl border px-3 py-2.5 text-left transition hover:border-[color:var(--primary)]"
        style={{ background: nextReminder && daysUntil(nextReminder.due) <= 0 ? 'var(--expense-soft)' : '#fff8e8', borderColor: 'var(--line)' }}>
        <span className="text-lg">⏰</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold">{nextReminder ? tx('Upcoming reminder') : tx('No reminder saved')}</div>
          <div className="tiny muted truncate">{nextReminder?.text || tx('Set a reminder date when adding a transaction')}</div>
        </div>
        <span className="pill !text-[10px]" style={{ background: nextReminder && daysUntil(nextReminder.due) <= 0 ? 'var(--expense)' : '#b45309', color: '#fff' }}>
          {nextReminder ? reminderDaysLabel(nextReminder.due) : '—'}
        </span>
      </button>

      <SectionTitle title={tx('My Accounts')} action={tx('See all')} onAction={() => onNavigate('accounts')} />
      <div className="flex gap-2.5 overflow-x-auto scroll-none pb-1 -mx-1 px-1">
        {accounts.map((a) => {
          const s = stats[a.id] || { balance: 0, in: 0, out: 0 };
          return (
            <button key={a.id} onClick={() => onNavigate('accounts')} className="min-w-[158px] text-left bg-card border border-line rounded-2xl p-3.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: a.color }}>{a.icon}</span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold truncate">{a.name}</div>
                  <div className="tiny muted">{a.type}</div>
                </div>
              </div>
              <div className="num text-[17px] mt-3">{money(s.balance)}</div>
              <div className="flex gap-2 mt-1 num !text-[10px]">
                <span style={{ color: 'var(--income)' }}>In {money(s.in, true)}</span>
                <span style={{ color: 'var(--expense)' }}>Out {money(s.out, true)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <SectionTitle title={tx('Account Flow')} action={tx('Details')} onAction={() => onNavigate('accounts')} />
      <div className="card !py-1">
        {accounts.slice(0, 5).map((a) => {
          const s = stats[a.id] || { balance: 0, in: 0, out: 0 };
          return (
            <div key={a.id} className="flex items-center gap-2.5 py-2.5 border-b border-line last:border-0">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: a.color }}>{a.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold">{a.name}</div>
                <div className="tiny muted">{a.type}</div>
              </div>
              <div className="text-right">
                <div className="num text-[14px]">{money(s.balance)}</div>
                <div className="tiny num"><span style={{ color: 'var(--income)' }}>+{money(s.in, true)}</span> · <span style={{ color: 'var(--expense)' }}>−{money(s.out, true)}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <SectionTitle title={tx('Expense Trend')} action={<span className="flex items-center gap-1"><BarChart3 size={13} /> {tx('7 days')}</span>} />
      <div className="card">
        <div className="h-[160px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} barGap={2} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)} />
              <Tooltip cursor={{ fill: 'var(--primary-soft)', opacity: 0.4 }} formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 11 }} />
              <Bar dataKey="expense" name="Money Out" fill="var(--primary)" radius={[5, 5, 2, 2]} maxBarSize={22} />
              <Bar dataKey="income" name="Money In" fill="var(--primary-soft)" radius={[5, 5, 2, 2]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="tiny muted text-center mt-2">{tx('Daily money flow · last 7 days · BDT')}</div>
      </div>

      <SectionTitle title={tx('Spending by Category')} action={tx('Details')} onAction={() => onNavigate('reports')} />
      <div className="card">
        <div className="flex items-center gap-4">
          <Donut data={cats} size={100} />
          <CategoryLegend data={cats} />
        </div>
        <button className="link text-[11px] mt-3 flex items-center gap-1" onClick={() => onNavigate('reports')}>{tx('Full report')} <ChevronRight size={13} /></button>
      </div>

      <SectionTitle title={t('recent')} action={tx('View all')} onAction={() => onNavigate('transactions')} />
      {recent.length ? <TxDayGroups items={recent} onEdit={onEdit} onDelete={onDelete} limit={3} /> : <div className="card tiny muted text-center py-6">{t('noData')}</div>}
    </div>
  );
}
