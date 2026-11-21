import { useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Eye, EyeOff,
  Sparkles, Wallet, BarChart3,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '../context/DataContext';
import { accountStats, categoryTotals, dailySeries, totals } from '../lib/finance';
import { money, monthName, shiftMonth, shortDate } from '../lib/format';
import { localize } from '../lib/i18n';
import { AnimatedMoney, CategoryIcon, Donut, CategoryLegend, SectionTitle } from '../components/ui';
import type { Transaction, TxType } from '../types';
import type { PageId } from '../components/Layout';

export function Dashboard({ onAdd, onEdit, onDelete, onNavigate }: {
  onAdd: (type: TxType) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onNavigate: (p: PageId) => void;
}) {
  const { accounts, transactions, categories, month, setMonth, settings, t, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  const bn = lang === 'bn';
  const [showBalance, setShowBalance] = useState(true);

  const tt = useMemo(() => totals(accounts, transactions, month), [accounts, transactions, month]);
  const stats = useMemo(() => accountStats(accounts, transactions, month), [accounts, transactions, month]);
  const series = useMemo(() => dailySeries(transactions, 7), [transactions]);
  const cats = useMemo(() => categoryTotals(transactions, month, 'expense', categories), [transactions, month, categories]);
  const recent = useMemo(() => [...transactions].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 5), [transactions]);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const hasData = accounts.length > 0 || transactions.length > 0;

  const spendPct = tt.expense <= 0 ? 0
    : tt.income <= 0 ? 100
    : Math.min(100, Math.round((tt.expense / tt.income) * 100));

  const activeDays = useMemo(() => new Set(transactions.filter((x) => x.date.startsWith(month)).map((x) => x.date)).size, [transactions, month]);
  const dailyAvg = tt.expense / Math.max(1, activeDays);
  const topCat = cats[0];
  const maxDay = Math.max(1, ...series.map((x) => x.expense));
  const sparkPoints = series.map((x, i) => `${(i / Math.max(1, series.length - 1)) * 100},${22 - (x.expense / maxDay) * 18}`).join(' ');

  const handleQuick = (type?: TxType) => {
    if (!type) { onNavigate('accounts'); return; }
    if (accounts.length === 0) onNavigate('accounts');
    else onAdd(type);
  };

  const actions: { label: string; icon: typeof ArrowUpRight; bg: string; fg: string; type?: TxType }[] = [
    { label: t('expense'), icon: ArrowUpRight, bg: 'var(--expense-soft)', fg: 'var(--expense)', type: 'expense' },
    { label: t('income'), icon: ArrowDownLeft, bg: 'var(--income-soft)', fg: 'var(--income)', type: 'income' },
    { label: t('transfer'), icon: ArrowLeftRight, bg: '#e9f0ff', fg: 'var(--blue)', type: 'transfer' },
    { label: t('accounts'), icon: Wallet, bg: 'var(--primary-soft)', fg: 'var(--primary-dark)' },
  ];

  return (
    <div>
      {/* Greeting + one-tap profile entry */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="tiny muted">{tx('Good day')}, {(settings.profileName || (bn ? 'বন্ধু' : 'there')).trim().split(/\s+/)[0]}</div>
          <div className="h-title">{t('dashboard')}</div>
          <div className="tiny muted hidden sm:block mt-0.5">{shortDate(new Date().toISOString().slice(0, 10))}</div>
        </div>
      </div>

      {/* Compact total balance — quiet summary alongside the greeting, not a giant hero */}
      <section className="balance-strip mt-4">
        <button className="flex items-center gap-2.5 min-w-0 text-left" onClick={() => setShowBalance((v) => !v)} aria-label={tx('Toggle balance visibility')}>
          <span className="min-w-0">
            <span className="balance-label">{t('totalBalance')}</span>
            <span className="flex items-center gap-2 mt-0.5">
              {showBalance
                ? <span style={{ color: 'var(--primary-dark)' }}><AnimatedMoney value={tt.balance} className="num text-[21px] leading-none" duration={320} /></span>
                : <span className="num text-[21px] leading-none">••••••</span>}
              {showBalance ? <Eye size={14} className="muted shrink-0" /> : <EyeOff size={14} className="muted shrink-0" />}
            </span>
            <span className="tiny muted block mt-1">
              {bn ? `${accounts.length}টি অ্যাকাউন্ট` : `${accounts.length} accounts`}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button className="w-7 h-7 rounded-lg flex items-center justify-center muted" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft size={15} />
          </button>
          <span className="text-[11px] font-semibold px-1 min-w-[78px] text-center">{monthName(month, lang)}</span>
          <button className="w-7 h-7 rounded-lg flex items-center justify-center muted" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <ChevronRight size={15} />
          </button>
        </div>
      </section>

      {/* Circular quick actions — one tap for every common entry */}
      <div className="grid grid-cols-4 gap-1 card !py-3 !px-2 mt-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.label} onClick={() => handleQuick(a.type)} className="flex flex-col items-center gap-1.5 py-1 active:scale-95 transition">
              <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: a.bg, color: a.fg }}>
                <Icon size={18} />
              </span>
              <span className="text-[11px] font-semibold">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Fresh start: single focused card only */}
      {!hasData && (
        <section className="card mt-3">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}>
              <Wallet size={19} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="display text-[15px]">{bn ? 'এখান থেকে শুরু করুন' : 'Start with your first account'}</div>
              <div className="tiny muted mt-1 leading-relaxed">
                {bn ? 'ব্যবহার শুরু করতে প্রথম অ্যাকাউন্ট যোগ করুন।' : 'Add your first account to start tracking.'}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="btn-primary !py-2 !px-3 !text-[11px]" onClick={() => onNavigate('accounts')}>
                  {tx('Add first account')}
                </button>
                <button className="btn-ghost !py-2 !px-3 !text-[11px]" onClick={() => onNavigate('categories')}>
                  {bn ? 'আগে বিভাগ যোগ করুন' : 'Add categories first'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {hasData && (
        <>
          {/* This month — spending progress */}
          <div className="card mt-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold">{bn ? 'এই মাস' : 'This month'}</div>
              <span className="tiny muted">{bn ? 'আয়ের তুলনায় খরচ' : 'Spent vs earned'}</span>
            </div>
            <div className="flex gap-6 mt-3">
              <div>
                <div className="tiny muted">{t('moneyIn')}</div>
                <div className="num text-[16px] mt-0.5" style={{ color: 'var(--income)' }}>{money(tt.income)}</div>
              </div>
              <div>
                <div className="tiny muted">{t('moneyOut')}</div>
                <div className="num text-[16px] mt-0.5" style={{ color: 'var(--expense)' }}>{money(tt.expense)}</div>
              </div>
            </div>
            <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--app-bg)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${spendPct}%`, background: 'var(--primary)' }} />
            </div>
            <div className="tiny muted mt-1.5">{spendPct}%{bn ? ' আয় খরচ হয়েছে' : ' of income spent'}</div>
          </div>

          {/* Smart insights — quick value without opening Reports */}
          <div className="card mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold"><Sparkles size={14} style={{ color: 'var(--primary)' }} /> {tx('Smart insights')}</div>
              <button className="link !text-[10px]" onClick={() => onNavigate('reports')}>{tx('Full report')} ›</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MiniStat label={tx('Daily average')} value={money(dailyAvg, true)} tone="var(--expense)" />
              <MiniStat label={tx('Top category')} value={topCat?.name || '—'} tone="var(--primary-dark)" />
              <MiniStat label={tx('Active days')} value={String(activeDays)} tone="var(--income)" />
            </div>
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-9 mt-3" aria-hidden="true">
              <polyline points={sparkPoints} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="tiny muted text-center -mt-1">{tx('7-day expense pulse')}</div>
          </div>

          <SectionTitle title={t('accounts')} action={tx('See all')} onAction={() => onNavigate('accounts')} />
          <div className="flex gap-2.5 overflow-x-auto scroll-none pb-1 -mx-1 px-1">
            {accounts.map((a) => {
              const s = stats[a.id] || { balance: 0, in: 0, out: 0 };
              return (
                <button key={a.id} onClick={() => onNavigate('accounts')} className="card !min-w-[162px] text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: a.color }}>{a.icon}</span>
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

          <SectionTitle title={t('recent')} action={tx('View all')} onAction={() => onNavigate('transactions')} />
          {recent.length ? (
            <div className="card !py-0">
              {recent.map((tr) => {
                const c = catMap[tr.categoryId];
                const isIncome = tr.type === 'income';
                return (
                  <div key={tr.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: c?.color ? `${c.color}22` : 'var(--primary-soft)', color: c?.color || 'var(--primary-dark)' }}>
                      {c ? <CategoryIcon name={c.icon} size={16} /> : <Wallet size={16} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold truncate">{tr.note || c?.name || t('expense')}</div>
                      <div className="tiny muted truncate">{c?.name || tr.type} · {shortDate(tr.date)}</div>
                    </div>
                    <div className="num text-[13px] shrink-0" style={{ color: isIncome ? 'var(--income)' : 'var(--expense)' }}>
                      {isIncome ? '+' : '−'}{money(tr.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="card tiny muted text-center py-6">{t('noData')}</div>}

          {transactions.length > 0 && (
            <>
              <SectionTitle title={bn ? 'খরচের overview' : 'Spending overview'} />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="card">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold mb-2"><BarChart3 size={14} /> {tx('Expense Trend')}</div>
                  <div className="h-[150px] -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={series} barGap={2} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)} />
                        <Tooltip cursor={{ fill: 'var(--primary-soft)', opacity: 0.4 }} formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 11 }} />
                        <Bar dataKey="expense" name={t('moneyOut')} fill="var(--primary)" radius={[5, 5, 2, 2]} maxBarSize={20} />
                        <Bar dataKey="income" name={t('moneyIn')} fill="var(--primary-soft)" radius={[5, 5, 2, 2]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="tiny muted text-center mt-1">{tx('Daily money flow · last 7 days · BDT')}</div>
                </div>

                <div className="card">
                  <div className="text-[12px] font-semibold mb-2">{tx('Spending by Category')}</div>
                  <div className="flex items-center gap-4">
                    <Donut data={cats} size={96} />
                    <CategoryLegend data={cats} />
                  </div>
                  <button className="link text-[11px] mt-3 flex items-center gap-1" onClick={() => onNavigate('reports')}>
                    {tx('Full report')} <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[16px] bg-app-bg px-2.5 py-2 min-w-0">
      <div className="tiny muted truncate">{label}</div>
      <div className="num text-[13px] mt-1 truncate" style={{ color: tone }}>{value}</div>
    </div>
  );
}
