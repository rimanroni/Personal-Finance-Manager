import { useMemo, useState } from 'react';
import { ArrowUpDown, Search, SlidersHorizontal, Plus, ChevronDown, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext';
import { accountStats, filterTransactions, totals } from '../lib/finance';
import { money } from '../lib/format';
import { localize } from '../lib/i18n';
import { haptic } from '../lib/haptic';
import { EmptyState, PageHeader } from '../components/ui';
import { TxDayGroups } from '../components/TxRow';
import type { Transaction } from '../types';

type SortId = 'newest' | 'oldest' | 'highest' | 'lowest';

export function Transactions({ onAdd, onEdit, onDelete }: {
  onAdd: () => void; onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void;
}) {
  const { accounts, transactions, month, t, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [sort, setSort] = useState<SortId>('newest');
  const [showAccounts, setShowAccounts] = useState(false);

  const tt = useMemo(() => totals(accounts, transactions, month), [accounts, transactions, month]);
  const stats = useMemo(() => accountStats(accounts, transactions, month), [accounts, transactions, month]);
  const list = useMemo(() => {
    const items = filterTransactions(transactions, {
      month: scope === 'month' ? month : undefined,
      type: filter.startsWith('type:') ? filter.slice(5) : undefined,
      accountId: filter.startsWith('acc:') ? filter.slice(4) : undefined,
      search,
    });
    if (sort === 'oldest') items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (sort === 'highest') items.sort((a, b) => b.amount - a.amount || (b.date + b.time).localeCompare(a.date + a.time));
    if (sort === 'lowest') items.sort((a, b) => a.amount - b.amount || (b.date + b.time).localeCompare(a.date + a.time));
    return items;
  }, [transactions, month, scope, filter, search, sort]);

  const { income, expense } = useMemo(() => ({
    income: list.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0),
    expense: list.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0),
  }), [list]);

  const chips = [
    { id: 'all', label: t('all') },
    { id: 'type:expense', label: t('expense') },
    { id: 'type:income', label: t('income') },
    { id: 'type:transfer', label: t('transfer') },
    ...accounts.map((a) => ({ id: `acc:${a.id}`, label: `${a.icon} ${a.name}` })),
  ];

  const sortOptions: { id: SortId; label: string }[] = [
    { id: 'newest', label: tx('Newest first') },
    { id: 'oldest', label: tx('Oldest first') },
    { id: 'highest', label: tx('Highest amount') },
    { id: 'lowest', label: tx('Lowest amount') },
  ];

  return (
    <div className="animate-fade">
      <PageHeader title={t('transactions')} subtitle={tx('Day-wise history · every wallet separate')}
        right={<button className="btn-soft !py-2 !px-3.5" onClick={onAdd}><Plus size={15} /> {t('add')}</button>} />

      {/* Compact snapshot — same totals, but no oversized hero taking over the page */}
      <section className="balance-strip mt-4 !block">
        <button className="w-full flex items-center justify-between gap-3 text-left" onClick={() => setShowAccounts((v) => !v)}>
          <span className="min-w-0">
            <span className="balance-label">{tx('Account snapshot · this month')}</span>
            <span className="num text-[20px] leading-none mt-0.5 block" style={{ color: 'var(--primary-dark)' }}>{money(tt.balance)}</span>
          </span>
          <ChevronDown size={16} className={`muted shrink-0 transition-transform ${showAccounts ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          {[
            { label: t('moneyIn'), value: tt.income, color: 'var(--income)' },
            { label: t('moneyOut'), value: tt.expense, color: 'var(--expense)' },
            { label: t('remaining'), value: tt.remaining, color: 'var(--primary-dark)' },
          ].map((c) => (
            <div key={c.label} className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] muted">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="truncate">{c.label}</span>
              </div>
              <div className="num text-[13px] mt-0.5" style={{ color: c.color }}>{money(c.value, true)}</div>
            </div>
          ))}
        </div>
        {showAccounts && (
          <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--line)' }}>
            {accounts.map((a) => {
              const s = stats[a.id] || { balance: 0, in: 0, out: 0 };
              return (
                <div key={a.id} className="flex items-center gap-2.5 py-1.5">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 bg-app-bg">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold truncate">{a.name}</div>
                    <div className="tiny num muted">
                      <span style={{ color: 'var(--income)' }}>+{money(s.in, true)}</span> · <span style={{ color: 'var(--expense)' }}>−{money(s.out, true)}</span>
                    </div>
                  </div>
                  <div className="num text-[13px]">{money(s.balance)}</div>
                </div>
              );
            })}
            {accounts.length === 0 && <div className="tiny muted text-center py-2">{tx('No accounts yet')}</div>}
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 mt-3">
        <div className="flex items-center gap-2 flex-1 bg-card rounded-full px-4 py-3 shadow-[0_5px_20px_-10px_rgba(21,29,51,.28)]">
          <Search size={16} className="muted" />
          <input className="flex-1 bg-transparent outline-none text-[12px]" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segment">
          {(['month', 'all'] as const).map((s) => (
            <button key={s} onClick={() => { haptic(); setScope(s); }} className={`seg ${scope === s ? 'on' : ''}`}>
              {s === 'month' ? tx('Month') : tx('All')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scroll-none mt-3 -mx-1 px-1">
        {chips.map((c) => <button key={c.id} className={`chip ${filter === c.id ? 'on' : ''}`} onClick={() => { haptic(); setFilter(c.id); }}>{c.label}</button>)}
      </div>

      {/* Sort — newest / oldest / amount */}
      <div className="flex items-center gap-2 mt-3">
        <span className="tiny muted flex items-center gap-1 shrink-0"><ArrowUpDown size={12} /> {tx('Sort')}</span>
        <div className="flex-1 flex gap-1.5 overflow-x-auto scroll-none">
          {sortOptions.map((o) => (
            <button key={o.id} className={`chip !py-1.5 !px-2.5 !text-[10px] ${sort === o.id ? 'on' : ''}`}
              onClick={() => { haptic(); setSort(o.id); }}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className="card-tight mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}><SlidersHorizontal size={15} /></span>
          <div>
            <div className="tiny muted">{list.length} {tx('entries found')}</div>
            <div className="num text-[14px]" style={{ color: 'var(--expense)' }}>{money(expense)} {tx('out')}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="tiny muted">{tx('Net in selection')}</div>
          <div className="num text-[14px]" style={{ color: 'var(--primary-dark)' }}>{money(income - expense)}</div>
        </div>
      </div>

      {list.length ? <TxDayGroups items={list} onEdit={onEdit} onDelete={onDelete} dateOrder={sort === 'oldest' ? 'asc' : 'desc'} /> : (
        <div className="mt-3"><EmptyState text={tx('No matching entries. Try another filter.')} icon={<Wallet size={24} color="var(--primary-dark)" />} /></div>
      )}
    </div>
  );
}
