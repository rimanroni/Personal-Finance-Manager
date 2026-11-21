import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { accountStats, filterTransactions, totals } from '../lib/finance';
import { money } from '../lib/format';
import { EmptyState, PageHeader } from '../components/ui';
import { TxDayGroups } from '../components/TxRow';
import type { Transaction } from '../types';

export function Transactions({ onAdd, onEdit, onDelete }: {
  onAdd: () => void; onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void;
}) {
  const { accounts, transactions, month, t } = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [showAccounts, setShowAccounts] = useState(false);

  const tt = totals(accounts, transactions, month);
  const stats = useMemo(() => accountStats(accounts, transactions, month), [accounts, transactions]);
  const list = useMemo(() => filterTransactions(transactions, {
    month: scope === 'month' ? month : undefined,
    type: filter.startsWith('type:') ? filter.slice(5) : undefined,
    accountId: filter.startsWith('acc:') ? filter.slice(4) : undefined,
    search,
  }), [transactions, month, scope, filter, search]);

  const income = list.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0);
  const expense = list.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0);

  const chips = [
    { id: 'all', label: t('all') },
    { id: 'type:expense', label: t('expense') },
    { id: 'type:income', label: t('income') },
    { id: 'type:transfer', label: t('transfer') },
    ...accounts.map((a) => ({ id: `acc:${a.id}`, label: `${a.icon} ${a.name}` })),
  ];

  return (
    <div className="animate-fade">
      <PageHeader title={t('transactions')} subtitle="Day-wise history · every wallet separate"
        right={<button className="icon-btn" onClick={onAdd}><Plus size={18} /></button>} />

      <button className="w-full card mt-3 text-left" onClick={() => setShowAccounts((v) => !v)}>
        <div className="row">
          <div>
            <div className="tiny muted">Account snapshot · this month</div>
            <div className="num text-[18px] mt-0.5">{money(tt.balance)}</div>
          </div>
          <SlidersHorizontal size={17} className="muted" />
        </div>
        {showAccounts && (
          <div className="mt-3 pt-3 border-t border-line space-y-2">
            {accounts.map((a) => {
              const s = stats[a.id] || { balance: 0, in: 0, out: 0 };
              return (
                <div key={a.id} className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: a.color }}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold truncate">{a.name}</div>
                    <div className="tiny num"><span style={{ color: 'var(--income)' }}>+{money(s.in, true)}</span> / <span style={{ color: 'var(--expense)' }}>−{money(s.out, true)}</span></div>
                  </div>
                  <div className="num text-[13px]">{money(s.balance)}</div>
                </div>
              );
            })}
          </div>
        )}
      </button>

      <div className="flex items-center gap-2 mt-3">
        <div className="flex items-center gap-2 flex-1 bg-card border border-line rounded-xl px-3 py-2.5">
          <Search size={16} className="muted" />
          <input className="flex-1 bg-transparent outline-none text-[12px]" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex bg-appbg rounded-xl p-1">
          {(['month', 'all'] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${scope === s ? 'bg-card shadow-sm' : 'muted'}`}>
              {s === 'month' ? 'Month' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scroll-none mt-3 -mx-1 px-1">
        {chips.map((c) => <button key={c.id} className={`chip ${filter === c.id ? 'on' : ''}`} onClick={() => setFilter(c.id)}>{c.label}</button>)}
      </div>

      <div className="card mt-3 !py-3 flex items-center justify-between">
        <div>
          <div className="tiny muted">{list.length} entries found</div>
          <div className="num text-[14px]" style={{ color: 'var(--expense)' }}>{money(expense)} out</div>
        </div>
        <div className="text-right">
          <div className="tiny muted">Net in selection</div>
          <div className="num text-[14px]" style={{ color: 'var(--primary-dark)' }}>{money(income - expense)}</div>
        </div>
      </div>

      {list.length ? <TxDayGroups items={list} onEdit={onEdit} onDelete={onDelete} /> : <div className="mt-3"><EmptyState text="No matching entries. Try another filter." icon="🔍" /></div>}
    </div>
  );
}
