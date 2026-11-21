import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import type { Transaction } from '../types';
import { useData } from '../context/DataContext';
import { money } from '../lib/format';
import { dayLabel } from '../lib/format';
import { groupByDate } from '../lib/finance';

export function TxRow({ tx, onEdit, onDelete, showActions = true }: {
  tx: Transaction; onEdit?: (t: Transaction) => void; onDelete?: (t: Transaction) => void; showActions?: boolean;
}) {
  const { accounts, categories } = useData();
  const account = accounts.find((a) => a.id === tx.accountId);
  const toAccount = accounts.find((a) => a.id === tx.toAccountId);
  const cat = categories.find((c) => c.id === tx.categoryId);
  const inc = tx.type === 'income';
  const tr = tx.type === 'transfer';
  const bg = inc ? 'var(--income-soft)' : tr ? '#e9f0ff' : 'var(--expense-soft)';
  const fg = inc ? 'var(--income)' : tr ? 'var(--blue)' : 'var(--expense)';
  const Icon = inc ? ArrowDownLeft : tr ? ArrowLeftRight : ArrowUpRight;
  const sub = tr
    ? `${account?.name || '—'} → ${toAccount?.name || '—'}`
    : `${cat?.name || 'Transfer'} · ${account?.name || '—'}`;

  return (
    <div className="flex items-center gap-3 bg-card rounded-[18px] px-3.5 py-3 mb-2 shadow-[0_4px_14px_-9px_rgba(21,29,51,.26)]">
      <div className="tx-icon" style={{ background: bg, color: fg }}><Icon /></div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold truncate">{tx.note || cat?.name || (tr ? 'Transfer' : 'Transaction')}</div>
        <div className="tiny muted truncate">
          {sub} <span className="pill !py-0 !px-2 ml-1" style={{ background: 'var(--app-bg)' }}>{tx.paymentMethod}</span> · {tx.time}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="num text-[13px]" style={{ color: inc ? 'var(--income)' : tr ? 'var(--blue)' : 'var(--expense)' }}>
          {inc ? '+' : tr ? '' : '−'}{money(tx.amount)}
        </div>
        {showActions && (
          <div className="flex gap-1">
            {onEdit && <button className="w-6 h-6 rounded-full bg-app-bg flex items-center justify-center muted hover:text-[color:var(--primary)]" onClick={() => onEdit(tx)} title="Edit"><Pencil size={11} /></button>}
            {onDelete && <button className="w-6 h-6 rounded-full bg-app-bg flex items-center justify-center muted hover:text-[color:var(--expense)]" onClick={() => onDelete(tx)} title="Delete"><Trash2 size={11} /></button>}
          </div>
        )}
      </div>
    </div>
  );
}

export function TxDayGroups({ items, onEdit, onDelete, limit, dateOrder = 'desc' }: {
  items: Transaction[]; onEdit?: (t: Transaction) => void; onDelete?: (t: Transaction) => void; limit?: number; dateOrder?: 'asc' | 'desc';
}) {
  const grouped = groupByDate(items);
  const groups = dateOrder === 'asc' ? [...grouped].reverse() : grouped;
  const shown = limit ? groups.slice(0, limit) : groups;
  return (
    <>
      {shown.map(([date, list]) => {
        const out = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const income = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        return (
          <div key={date}>
            <div className="flex items-center justify-between mt-4 mb-2 px-1">
              <span className="pill !text-[10px]" style={{ background: 'var(--shell)', color: '#fff' }}>{dayLabel(date)}</span>
              <span className="tiny muted num">Out {money(out)} · In {money(income)}</span>
            </div>
            {list.map((t) => <TxRow key={t.id} tx={t} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        );
      })}
    </>
  );
}
