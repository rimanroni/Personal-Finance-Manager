import { useMemo, useState } from 'react';
import { CalendarDays, Plus, Trash2, Pencil, Repeat, Target, Tags } from 'lucide-react';
import type { Budget, Category, Recurring, Transaction } from '../types';
import { useData } from '../context/DataContext';
import { budgetStatus, categoryTotals, nextRecurringDate, totals } from '../lib/finance';
import { dayLabel, daysUntil, money, monthName } from '../lib/format';
import { ConfirmDialog, EmptyState, Modal, MonthSwitcher, PageHeader, SectionTitle } from '../components/ui';
import { TxDayGroups, TxRow } from '../components/TxRow';

/* ---------------- Budget ---------------- */
export function BudgetPage() {
  const { accounts, transactions, categories, budgets, month, saveBudget, deleteBudget, showToast } = useData();
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Budget | null>(null);
  const [scope, setScope] = useState('');
  const [amount, setAmount] = useState('');
  const [del, setDel] = useState<Budget | null>(null);

  const spent = totals(accounts, transactions, month).expense;
  const byCat = useMemo(() => categoryTotals(transactions, month, 'expense', categories), [transactions, month, categories]);
  const list = budgets.filter((b) => b.month === month);
  const overall = list.find((b) => !b.categoryId);

  const open = (b?: Budget) => {
    setEdit(b || null);
    setScope(b?.categoryId || '');
    setAmount(String(b?.amount || ''));
    setModal(true);
  };

  return (
    <div className="animate-fade">
      <PageHeader title="Budget" subtitle="Set a limit and watch your spending"
        right={<button className="btn-soft !py-2 !px-3 !text-[12px]" onClick={() => open()}><Plus size={15} /> Add</button>} />
      <MonthSwitcher />

      {overall ? (
        <div className="card mt-3" key={overall.id}>
          <div className="row">
            <div><div className="tiny muted">Monthly Budget</div><div className="num text-[19px] mt-0.5">{money(spent)} <span className="text-[12px] muted">/ {money(overall.amount)}</span></div></div>
            <div className="flex gap-1">
              <button className="icon-btn !w-7 !h-7 !rounded-lg" onClick={() => open(overall)}><Pencil size={12} /></button>
              <button className="icon-btn !w-7 !h-7 !rounded-lg" onClick={() => setDel(overall)}><Trash2 size={12} /></button>
            </div>
          </div>
          <ProgressBar spent={spent} amount={overall.amount} />
        </div>
      ) : (
        <div className="mt-3"><EmptyState text="No overall monthly budget yet. Add one to track your limit." icon={<Target size={24} color="var(--primary-dark)" />} /></div>
      )}

      <SectionTitle title="Category Budgets" />
      <div className="card !py-1">
        {list.filter((b) => b.categoryId).length === 0 && <div className="tiny muted text-center py-4">No category budgets for this month.</div>}
        {list.filter((b) => b.categoryId).map((b) => {
          const cat = categories.find((c) => c.id === b.categoryId);
          const value = byCat.find((c) => c.id === b.categoryId)?.value || 0;
          return (
            <div key={b.id} className="py-3 border-b border-line last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: `${cat?.color}22`, color: cat?.color }}>{(cat?.name || '?').slice(0, 1)}</span>
                <div className="flex-1"><div className="text-[12px] font-semibold">{cat?.name || 'Category'}</div><div className="tiny num muted">{money(value)} / {money(b.amount)}</div></div>
                <button className="icon-btn !w-6 !h-6 !rounded-md" onClick={() => open(b)}><Pencil size={11} /></button>
                <button className="icon-btn !w-6 !h-6 !rounded-md" onClick={() => setDel(b)}><Trash2 size={11} /></button>
              </div>
              <ProgressBar spent={value} amount={b.amount} />
            </div>
          );
        })}
      </div>

      <div className="card mt-3 flex items-start gap-3">
        <Target className="muted shrink-0" size={18} />
        <div className="tiny muted">Budgets reset every month automatically — each budget is saved against its month. Past months are never deleted.</div>
      </div>

      <Modal open={modal} title={edit ? 'Edit Budget' : 'Add Budget'} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost flex-1" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={async () => {
            const value = Number(amount);
            if (!value || value <= 0) { showToast('Enter a valid amount'); return; }
            await saveBudget({ id: edit?.id, month, categoryId: scope || undefined, amount: value });
            setModal(false);
          }}>Save Budget</button>
        </>}>
        <div className="space-y-3">
          <div><div className="field-label mb-1">Applies to</div>
            <select className="select" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="">Overall monthly budget</option>
              {categories.filter((c) => c.type === 'expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><div className="field-label mb-1">Limit amount</div><input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!del} title="Remove budget?" message="This budget limit will be removed for the selected month." confirmLabel="Remove"
        onCancel={() => setDel(null)} onConfirm={async () => { if (del) await deleteBudget(del.id); setDel(null); }} />
    </div>
  );
}

function ProgressBar({ spent, amount }: { spent: number; amount: number }) {
  const { pct, status } = budgetStatus(spent, amount);
  const color = status === 'over' ? 'var(--expense)' : status === 'warn' ? 'var(--amber)' : 'var(--primary)';
  return (
    <div className="mt-3">
      <div className="h-2 rounded-full bg-appbg overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <div className="flex justify-between tiny muted mt-1.5">
        <span style={{ color }}>{Math.round(pct)}% used</span>
        <span>{status === 'over' ? `${money(spent - amount)} over` : `${money(amount - spent)} left`}</span>
      </div>
    </div>
  );
}

/* ---------------- Calendar ---------------- */
export function CalendarPage({ onEdit, onDelete }: { onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void }) {
  const { transactions, month, accounts, lang } = useData();
  const [selected, setSelected] = useState<string | null>(null);
  const [y, m] = month.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const byDay = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.filter((t) => t.date.startsWith(month)).forEach((t) => {
      const d = Number(t.date.slice(8));
      map[d] ||= { income: 0, expense: 0 };
      if (t.type === 'income') map[d].income += t.amount;
      if (t.type === 'expense') map[d].expense += t.amount;
    });
    return map;
  }, [transactions, month]);
  const daysWithEntries = Object.keys(byDay).filter((d) => byDay[d].income || byDay[d].expense).length;
  const selectedTx = selected ? transactions.filter((t) => t.date === selected) : [];

  return (
    <div className="animate-fade">
      <PageHeader title="Calendar" subtitle={`${daysWithEntries} active days in ${monthName(month, lang)}`} />
      <MonthSwitcher />
      <div className="card mt-3">
        <div className="grid grid-cols-7 gap-1 text-center tiny muted mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const key = `${month}-${String(day).padStart(2, '0')}`;
            const v = byDay[day] || { income: 0, expense: 0 };
            const active = selected === key;
            return (
              <button key={i} onClick={() => setSelected(active ? null : key)}
                className={`rounded-xl py-1.5 flex flex-col items-center transition ${active ? 'text-white' : ''}`}
                style={active ? { background: 'var(--primary)' } : { background: v.expense ? 'var(--expense-soft)' : v.income ? 'var(--income-soft)' : 'var(--app-bg)' }}>
                <span className="num !text-[12px]">{day}</span>
                {v.expense > 0 && <span className="text-[8px]" style={{ color: active ? '#fff' : 'var(--expense)' }}>−{money(v.expense, true)}</span>}
                {v.income > 0 && <span className="text-[8px]" style={{ color: active ? '#fff' : 'var(--income)' }}>+{money(v.income, true)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="mt-2">
          <SectionTitle title={dayLabel(selected)} action="Clear" onAction={() => setSelected(null)} />
          {selectedTx.length ? <TxDayGroups items={selectedTx} onEdit={onEdit} onDelete={onDelete} /> : <EmptyState text="No transactions on this day." icon={<CalendarDays size={24} color="var(--primary-dark)" />} />}
        </div>
      )}

      <div className="card mt-4">
        <div className="small font-semibold mb-2">Accounts</div>
        <div className="flex flex-wrap gap-1.5">{accounts.map((a) => <span key={a.id} className="chip !cursor-default">{a.icon} {a.name}</span>)}</div>
      </div>
    </div>
  );
}

/* ---------------- Categories ---------------- */
export function CategoriesPage() {
  const { categories, saveCategory, deleteCategory, showToast } = useData();
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [del, setDel] = useState<Category | null>(null);
  const list = categories.filter((c) => c.type === tab);

  const open = (c?: Category) => { setEdit(c || null); setName(c?.name || ''); setModal(true); };

  return (
    <div className="animate-fade">
      <PageHeader title="Categories" subtitle="Organise your income and expenses"
        right={<button className="btn-soft !py-2 !px-3 !text-[12px]" onClick={() => open()}><Plus size={15} /> Add</button>} />
      <div className="segment mt-4">
        {(['expense', 'income'] as const).map((x) => (
          <button key={x} onClick={() => setTab(x)} className={`seg capitalize ${tab === x ? 'on' : ''}`}>{x}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {list.length === 0 && (
          <div className="col-span-2">
            <EmptyState icon={<Tags size={24} color="var(--primary-dark)" />} text={`No ${tab} categories yet. Add only the ones you actually use.`} />
          </div>
        )}
        {list.map((c) => (
          <div key={c.id} className="card !p-3 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${c.color}22`, color: c.color }}><Tags size={16} /></span>
            <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold truncate">{c.name}</div><div className="tiny muted">{c.type}</div></div>
            <button className="icon-btn !w-6 !h-6 !rounded-md" onClick={() => open(c)}><Pencil size={11} /></button>
            <button className="icon-btn !w-6 !h-6 !rounded-md" onClick={() => setDel(c)}><Trash2 size={11} /></button>
          </div>
        ))}
      </div>
      <Modal open={modal} title={edit ? 'Edit Category' : 'Add Category'} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost flex-1" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={async () => {
            if (!name.trim()) { showToast('Enter a category name'); return; }
            await saveCategory({ id: edit?.id, name, type: tab, color: edit?.color, icon: edit?.icon });
            setModal(false);
          }}>Save Category</button>
        </>}>
        <div><div className="field-label mb-1">Name</div><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" /></div>
      </Modal>
      <ConfirmDialog open={!!del} title="Delete category?" message={`“${del?.name || ''}” will be removed. Existing transactions keep their record.`} confirmLabel="Delete"
        onCancel={() => setDel(null)} onConfirm={async () => { if (del) await deleteCategory(del.id); setDel(null); }} />
    </div>
  );
}

/* ---------------- Recurring ---------------- */
export function RecurringPage() {
  const { recurring, accounts, categories, saveRecurring, deleteRecurring, showToast } = useData();
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Recurring | null>(null);
  const [form, setForm] = useState({ type: 'expense' as 'expense' | 'income', amount: '', categoryId: '', accountId: '', paymentMethod: 'bKash', note: '', frequency: 'monthly', nextDate: '' });
  const [del, setDel] = useState<Recurring | null>(null);

  const open = (r?: Recurring) => {
    setEdit(r || null);
    setForm(r ? {
      type: r.type, amount: String(r.amount), categoryId: r.categoryId, accountId: r.accountId,
      paymentMethod: r.paymentMethod, note: r.note, frequency: r.frequency, nextDate: r.nextDate,
    } : {
      type: 'expense', amount: '', categoryId: categories.find((c) => c.type === 'expense')?.id || '',
      accountId: accounts.find((a) => a.type === 'bKash')?.id || accounts[0]?.id || '',
      paymentMethod: 'bKash', note: '', frequency: 'monthly', nextDate: new Date().toISOString().slice(0, 10),
    });
    setModal(true);
  };
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="animate-fade">
      <PageHeader title="Recurring" subtitle="Rent, salary, subscriptions — on schedule"
        right={<button className="btn-soft !py-2 !px-3 !text-[12px]" onClick={() => open()}><Plus size={15} /> Add</button>} />
      <div className="card mt-4 !py-1">
        {recurring.length === 0 && <div className="tiny muted text-center py-5">No recurring schedules yet.</div>}
        {recurring.map((r) => {
          const a = accounts.find((x) => x.id === r.accountId);
          const cat = categories.find((c) => c.id === r.categoryId);
          const days = daysUntil(r.nextDate);
          return (
            <div key={r.id} className="flex items-center gap-2.5 py-3 border-b border-line last:border-0">
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: r.type === 'income' ? 'var(--income-soft)' : 'var(--expense-soft)', color: r.type === 'income' ? 'var(--income)' : 'var(--expense)' }}><Repeat size={16} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate">{r.note || cat?.name || 'Recurring entry'}</div>
                <div className="tiny muted capitalize">{r.frequency} · {a?.name || '—'} · next {r.nextDate} <span style={{ color: days <= 0 ? 'var(--expense)' : 'var(--muted)' }}>({days <= 0 ? 'due' : `${days}d`})</span></div>
              </div>
              <div className="num text-[13px]" style={{ color: r.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>{r.type === 'income' ? '+' : '−'}{money(r.amount)}</div>
              <button className="icon-btn !w-6 !h-6 !rounded-md" onClick={() => open(r)}><Pencil size={11} /></button>
              <button className="icon-btn !w-6 !h-6 !rounded-md" onClick={() => setDel(r)}><Trash2 size={11} /></button>
            </div>
          );
        })}
      </div>

      <Modal open={modal} title={edit ? 'Edit Schedule' : 'Add Schedule'} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost flex-1" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={async () => {
            const value = Number(form.amount);
            if (!value || value <= 0) { showToast('Enter a valid amount'); return; }
            await saveRecurring({
              id: edit?.id, type: form.type, amount: value, categoryId: form.categoryId,
              accountId: form.accountId, paymentMethod: form.paymentMethod, note: form.note,
              frequency: form.frequency as Recurring['frequency'],
              nextDate: form.nextDate || new Date().toISOString().slice(0, 10),
              active: edit?.active ?? true, startDate: edit?.startDate,
            });
            setModal(false);
          }}>Save Schedule</button>
        </>}>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map((x) => <button key={x} onClick={() => set('type', x)} className={`chip flex-1 !text-center ${form.type === x ? 'on' : ''}`}>{x}</button>)}
          </div>
          <div><div className="field-label mb-1">Amount</div><input type="number" className="input" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
          <div><div className="field-label mb-1">Category</div><select className="select" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>{categories.filter((c) => c.type === form.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><div className="field-label mb-1">Account</div><select className="select" value={form.accountId} onChange={(e) => set('accountId', e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="field-label mb-1">Frequency</div><select className="select" value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>{['daily', 'weekly', 'monthly', 'yearly'].map((x) => <option key={x} value={x} className="capitalize">{x}</option>)}</select></div>
            <div><div className="field-label mb-1">Next date</div><input type="date" className="input" value={form.nextDate} onChange={(e) => set('nextDate', e.target.value)} /></div>
          </div>
          <div><div className="field-label mb-1">Note</div><input className="input" value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Monthly rent" /></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!del} title="Remove schedule?" message="This recurring schedule will be stopped." confirmLabel="Remove"
        onCancel={() => setDel(null)} onConfirm={async () => { if (del) await deleteRecurring(del.id); setDel(null); }} />
    </div>
  );
}

export { nextRecurringDate };
