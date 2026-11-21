import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Camera, Clock, FileText, Hash,
  Image as ImageIcon, Layers, Mail, Trash2, Copy,
} from 'lucide-react';
import type { Transaction, TxType } from '../types';
import { useData } from '../context/DataContext';
import { nowTime, todayISO } from '../lib/format';
import { ConfirmDialog, Modal } from './ui';
import type { PageId } from './Layout';
import { uid } from '../db';
import { shrinkImage } from '../lib/image';

const PAYMENTS = ['Cash', 'Bank', 'bKash', 'Nagad', 'Rocket', 'Card', 'Other'];
const NOTE_CHIPS = ['Weekly grocery budget', 'Rent — pay on due date', 'Fuel only on Fridays', 'Subscription renewal'];

export function TransactionSheet({ open, initialType = 'expense', edit, onClose, onNavigate }: {
  open: boolean; initialType?: TxType; edit: Transaction | null; onClose: () => void; onNavigate?: (p: PageId) => void;
}) {
  const { accounts, categories, saveTransaction, deleteTransaction, duplicateTransaction, showToast } = useData();
  const [type, setType] = useState<TxType>(initialType);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowTime());
  const [payment, setPayment] = useState('Cash');
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [reminder, setReminder] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cats = useMemo(() => categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense')), [categories, type]);
  const isTransfer = type === 'transfer';

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setType(edit.type);
      setAmount(String(edit.amount));
      setCategoryId(edit.categoryId);
      setAccountId(edit.accountId);
      setToAccountId(edit.toAccountId || '');
      setDate(edit.date);
      setTime(edit.time);
      setPayment(edit.paymentMethod);
      setTags(edit.tags.join(' '));
      setNote(edit.note);
      setReminder(edit.reminderDate || '');
      setPhoto(edit.photo);
    } else {
      const first = accounts.find((a) => a.type === 'bKash') || accounts[0];
      setType(initialType);
      setAmount('');
      setCategoryId(categories.find((c) => c.type === (initialType === 'income' ? 'income' : 'expense'))?.id || '');
      setAccountId(first?.id || '');
      setToAccountId(accounts.find((a) => a.id !== first?.id)?.id || '');
      setDate(todayISO());
      setTime(nowTime());
      setPayment(first?.type && PAYMENTS.includes(first.type) ? first.type : 'Cash');
      setTags('');
      setNote('');
      setReminder('');
      setPhoto(undefined);
    }
  }, [open, edit?.id, initialType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isTransfer && cats.length && !cats.some((c) => c.id === categoryId)) setCategoryId(cats[0].id);
  }, [cats, categoryId, isTransfer]);

  /** Keep the wallet and its payment rail welded together — bKash stays bKash. */
  const pickAccount = (id: string) => {
    setAccountId(id);
    const acc = accounts.find((a) => a.id === id);
    if (acc && PAYMENTS.includes(acc.type)) setPayment(acc.type);
  };
  const pickPayment = (p: string) => {
    setPayment(p);
    const acc = accounts.find((a) => a.type === p);
    if (acc) setAccountId(acc.id);
  };

  const handleSave = async () => {
    const value = Number(amount);
    if (!value || value <= 0) { showToast('Enter a valid amount'); return; }
    if (!accountId) { showToast('Select an account'); return; }
    if (isTransfer && (!toAccountId || toAccountId === accountId)) { showToast('Choose a different destination account'); return; }
    const now = Date.now();
    const tx: Transaction = {
      id: edit?.id || uid(),
      type,
      amount: value,
      date,
      time,
      accountId,
      toAccountId: isTransfer ? toAccountId : undefined,
      categoryId: isTransfer ? '' : categoryId,
      paymentMethod: isTransfer ? (accounts.find((a) => a.id === accountId)?.type || 'Bank') : payment,
      note: note.trim(),
      tags: tags.split(/[\s,]+/).map((x) => x.replace(/^#/, '').trim()).filter(Boolean),
      photo,
      reminderDate: reminder || undefined,
      notified: edit?.notified || false,
      createdAt: edit?.createdAt || now,
      updatedAt: now,
    };
    await saveTransaction(tx);
    onClose();
  };

  const tabs: { id: TxType; label: string; icon: typeof ArrowUpRight }[] = [
    { id: 'expense', label: 'Expense', icon: ArrowUpRight },
    { id: 'income', label: 'Income', icon: ArrowDownLeft },
    { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
  ];

  return (
    <>
      <Modal open={open} title={edit ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose}
        footer={
          <>
            {edit && (
              <button className="btn-danger !px-3" onClick={() => setConfirmDelete(true)} title="Delete"><Trash2 size={17} /></button>
            )}
            {edit && (
              <button className="btn-ghost !px-3" title="Duplicate" onClick={async () => { await duplicateTransaction(edit.id); onClose(); }}><Copy size={16} /></button>
            )}
            <button className="btn-primary flex-1" onClick={handleSave}>{edit ? 'Update Entry' : 'Save Transaction'}</button>
          </>
        }>
        <div className="flex gap-2">
          {tabs.map((tb) => {
            const Icon = tb.icon;
            const active = type === tb.id;
            return (
              <button key={tb.id} onClick={() => setType(tb.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-semibold transition ${active ? 'text-white border-transparent' : 'border-line muted'}`}
                style={active ? { background: tb.id === 'income' ? 'var(--income)' : tb.id === 'expense' ? 'var(--expense)' : 'var(--primary)' } : undefined}>
                <Icon size={14} />{tb.label}
              </button>
            );
          })}
        </div>

        {accounts.length === 0 && (
          <div className="mt-3 rounded-2xl p-3 text-center" style={{ background: 'var(--primary-soft)' }}>
            <div className="small font-semibold">Add an account first 🌱</div>
            <div className="tiny muted mt-1">No demo entries here. Create your own bKash, Nagad or Bank account, then start adding transactions.</div>
            {onNavigate && (
              <button className="btn-soft !py-2 !px-3 !text-[11px] mt-2" onClick={() => { onClose(); onNavigate('accounts'); }}>
                Go to Accounts
              </button>
            )}
          </div>
        )}

        <div className="text-center py-5">
          <span className="display text-[22px] muted">৳</span>
          <input inputMode="decimal" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
            className="w-[75%] bg-transparent outline-none text-center num !text-[36px] placeholder:opacity-30" />
          <div className="tiny muted -mt-1">BDT · Bangladeshi Taka</div>
        </div>

        <div className="divide-y divide-line">
          {!isTransfer && (
            <div className="flex items-center justify-between py-2.5 gap-3">
              <div className="field-label"><Layers size={15} />Category</div>
              <select className="select !w-auto !py-1.5 text-right max-w-[58%]" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between py-2.5 gap-3">
            <div className="field-label"><Mail size={15} />{isTransfer ? 'From Account' : 'Account'}</div>
            <select className="select !w-auto !py-1.5 text-right max-w-[58%]" value={accountId} onChange={(e) => pickAccount(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>
          {isTransfer && (
            <div className="flex items-center justify-between py-2.5 gap-3">
              <div className="field-label"><ArrowLeftRight size={15} />To Account</div>
              <select className="select !w-auto !py-1.5 text-right max-w-[58%]" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 py-2.5">
            <div>
              <div className="field-label mb-1"><FileText size={14} />Date</div>
              <input type="date" className="input !py-2" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <div className="field-label mb-1"><Clock size={14} />Time</div>
              <input type="time" className="input !py-2" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5 gap-3">
            <div className="field-label"><Hash size={15} />Payment method</div>
            <select className="select !w-auto !py-1.5 text-right max-w-[58%]" value={payment} onChange={(e) => pickPayment(e.target.value)}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between py-2.5 gap-3">
            <div className="field-label"><Hash size={15} />Tags</div>
            <input className="input !w-auto !py-1.5 text-right max-w-[58%]" placeholder="#lunch #daily" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="py-2.5">
            <div className="field-label mb-2"><FileText size={15} />Note</div>
            <textarea className="input resize-none !py-2" rows={2} placeholder="e.g. Weekly grocery from bKash" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-1.5 flex-wrap mt-2">
              {NOTE_CHIPS.map((c) => (
                <button key={c} className="pill bg-appbg muted" onClick={() => setNote((v) => (v ? `${v} · ${c}` : c))}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5 gap-3">
            <div className="field-label">⏰ Reminder date</div>
            <input type="date" className="input !w-auto !py-1.5" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 mt-3 text-[12px] font-semibold cursor-pointer" style={{ color: 'var(--primary-dark)' }}>
          {photo ? <ImageIcon size={16} /> : <Camera size={16} />}
          {photo ? 'Receipt attached — tap to replace' : 'Attach photo / receipt'}
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setPhoto(await shrinkImage(f));
          }} />
        </label>
        {photo && <img src={photo} alt="receipt" className="mt-2 h-24 w-full object-cover rounded-xl border border-line" />}
      </Modal>

      <ConfirmDialog open={confirmDelete} title="Delete this entry?"
        message={`${note || (edit ? edit.categoryId : '')} · ৳${edit?.amount || 0} will be removed. This cannot be undone.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => { if (edit) await deleteTransaction(edit.id); setConfirmDelete(false); onClose(); }} />
    </>
  );
}
