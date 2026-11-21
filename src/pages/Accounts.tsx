import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, StickyNote, Bell, Wallet } from 'lucide-react';
import type { Account, Note } from '../types';
import { useData } from '../context/DataContext';
import { totals } from '../lib/finance';
import { money, daysUntil } from '../lib/format';
import { ConfirmDialog, Modal, PageHeader, SectionTitle } from '../components/ui';
import type { PageId } from '../components/Layout';
import { localize } from '../lib/i18n';

const TYPES = ['Bank', 'bKash', 'Nagad', 'Rocket', 'Cash', 'Savings', 'Other'];

export function Accounts({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { accounts, transactions, notes, saveAccount, deleteAccount, saveNote, deleteNote, showToast, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  const [accModal, setAccModal] = useState<{ open: boolean; edit?: Account }>({ open: false });
  const [noteModal, setNoteModal] = useState<{ open: boolean; edit?: Note }>({ open: false });
  const [delAcc, setDelAcc] = useState<Account | null>(null);
  const [delNote, setDelNote] = useState<Note | null>(null);

  const [aName, setAName] = useState('');
  const [aType, setAType] = useState('bKash');
  const [aOpening, setAOpening] = useState('0');
  const [nText, setNText] = useState('');
  const [nAccount, setNAccount] = useState('');
  const [nReminder, setNReminder] = useState('');

  const lifetime = useMemo(() => totals(accounts, transactions, ''), [accounts, transactions]);

  const openAccount = (a?: Account) => {
    setAccModal({ open: true, edit: a });
    setAName(a?.name || '');
    setAType(a?.type || 'bKash');
    setAOpening(String(a?.openingBalance ?? 0));
  };
  const openNote = (n?: Note) => {
    setNoteModal({ open: true, edit: n });
    setNText(n?.text || '');
    setNAccount(n?.accountId || '');
    setNReminder(n?.reminderDate || '');
  };

  return (
    <div className="animate-fade">
      <PageHeader title="Accounts" subtitle="bKash, Nagad, Bank — alada alada hisab"
        right={<button className="btn-soft !py-2 !px-3.5" onClick={() => openAccount()}><Plus size={15} /> Add</button>} />

      <SectionTitle title="All Accounts" action="+ Add" onAction={() => openAccount()} />
      {accounts.length === 0 ? (
        <div className="card text-center py-8">
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}>
            <Wallet size={24} />
          </div>
          <div className="small muted px-4">No accounts yet. Add bKash, Nagad, Bank or Cash — only your own entries live here.</div>
          <button className="btn-primary !py-2 !px-4 !text-[11px] mt-4" onClick={() => openAccount()}>Add first account</button>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {accounts.map((a) => {
            const s = lifetime.stats[a.id] || { balance: 0, in: 0, out: 0 };
            return (
              <div key={a.id} className="card !p-4">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: a.color }}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-extrabold truncate">{a.name}</div>
                    <span className="pill !text-[9px] mt-0.5 inline-block" style={{ background: 'var(--app-bg)' }}>{a.type}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="icon-btn !w-7 !h-7" onClick={() => openAccount(a)} title="Edit"><Pencil size={12} /></button>
                    <button className="icon-btn !w-7 !h-7" onClick={() => setDelAcc(a)} title="Delete"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="num text-[20px] mt-3">{money(s.balance)}</div>
                <div className="flex items-center justify-between mt-1.5 pt-2.5 border-t border-line text-[10px] num">
                  <span>Opening {money(a.openingBalance, true)}</span>
                  <span><span style={{ color: 'var(--income)' }}>+{money(s.in, true)}</span> · <span style={{ color: 'var(--expense)' }}>−{money(s.out, true)}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt-3">
        <div className="small font-extrabold mb-2">Supported account types</div>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((type) => <span key={type} className="chip !cursor-default">{type}</span>)}
        </div>
        <div className="tiny muted mt-2">Each payment method keeps its own balance. bKash entries never enter Nagad, and the other way around.</div>
      </div>

      <SectionTitle title="Custom Spending Notes" action="+ Add note" onAction={() => openNote()} />
      <div className="card">
        {notes.length === 0 && <div className="tiny muted text-center py-4">No notes yet. Add a reminder note tied to an account.</div>}
        {notes.map((n) => {
          const acc = accounts.find((a) => a.id === n.accountId);
          const due = n.reminderDate ? daysUntil(n.reminderDate) : null;
          return (
            <div key={n.id} className="flex items-start gap-2.5 py-2.5 border-b border-line last:border-0">
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}><StickyNote size={15} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-extrabold">{acc ? `${acc.icon} ${acc.name}` : 'General note'} {due !== null && <span className="pill ml-1" style={{ background: due <= 0 ? 'var(--expense-soft)' : 'var(--primary-soft)', color: due <= 0 ? 'var(--expense)' : 'var(--primary-dark)' }}>{due <= 0 ? 'Due' : `in ${due}d`}</span>}</div>
                <div className="text-[11px] muted mt-1 leading-snug">{n.text}</div>
              </div>
              {n.reminderDate && <Bell size={13} className="muted mt-1 shrink-0" />}
              <button className="icon-btn !w-7 !h-7" onClick={() => openNote(n)}><Pencil size={11} /></button>
              <button className="icon-btn !w-7 !h-7" onClick={() => setDelNote(n)}><Trash2 size={11} /></button>
            </div>
          );
        })}
        <div className="tiny muted text-center mt-2">{tx('Set a reminder date to get a phone notification.')}</div>
      </div>

      <button className="link text-[11px] mt-4 flex items-center gap-1" onClick={() => onNavigate('allSettings')}><Wallet size={13} /> Data, backup & security</button>

      {/* Account modal */}
      <Modal open={accModal.open} title={accModal.edit ? 'Edit Account' : 'Add Account'} onClose={() => setAccModal({ open: false })}
        footer={<>
          <button className="btn-ghost flex-1" onClick={() => setAccModal({ open: false })}>Cancel</button>
          <button className="btn-primary flex-1" onClick={async () => {
            if (!aName.trim()) { showToast('Enter an account name'); return; }
            await saveAccount({ id: accModal.edit?.id, name: aName, type: aType, openingBalance: Number(aOpening) || 0 });
            setAccModal({ open: false });
          }}>Save Account</button>
        </>}>
        <div className="space-y-3">
          <div><div className="field-label mb-1">Account name</div><input className="input" value={aName} onChange={(e) => setAName(e.target.value)} placeholder="e.g. bKash Personal" /></div>
          <div><div className="field-label mb-1">Type</div><select className="select" value={aType} onChange={(e) => setAType(e.target.value)}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><div className="field-label mb-1">Opening balance</div><input type="number" className="input" value={aOpening} onChange={(e) => setAOpening(e.target.value)} /></div>
        </div>
      </Modal>

      {/* Note modal */}
      <Modal open={noteModal.open} title={noteModal.edit ? 'Edit Note' : 'Add Note'} onClose={() => setNoteModal({ open: false })}
        footer={<>
          <button className="btn-ghost flex-1" onClick={() => setNoteModal({ open: false })}>Cancel</button>
          <button className="btn-primary flex-1" onClick={async () => {
            if (!nText.trim()) { showToast('Write a note first'); return; }
            await saveNote({ id: noteModal.edit?.id, text: nText, accountId: nAccount || undefined, reminderDate: nReminder || undefined, notified: noteModal.edit?.notified });
            setNoteModal({ open: false });
          }}>Save Note</button>
        </>}>
        <div className="space-y-3">
          <div><div className="field-label mb-1">Tie to account</div><select className="select" value={nAccount} onChange={(e) => setNAccount(e.target.value)}><option value="">General</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}</select></div>
          <div><div className="field-label mb-1">Note</div><textarea className="input resize-none" rows={3} value={nText} onChange={(e) => setNText(e.target.value)} placeholder="e.g. Rent ৳12,000 — pay on the due date" /></div>
          <div><div className="field-label mb-1">Reminder date (phone notification)</div><input type="date" className="input" value={nReminder} onChange={(e) => setNReminder(e.target.value)} /></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delAcc} title="Delete account?" message={`“${delAcc?.name}” will be removed. Accounts with transactions cannot be deleted.`}
        confirmLabel="Delete" onCancel={() => setDelAcc(null)} onConfirm={async () => { if (delAcc) await deleteAccount(delAcc.id); setDelAcc(null); }} />
      <ConfirmDialog open={!!delNote} title="Delete note?" message="This custom note will be removed."
        confirmLabel="Delete" onCancel={() => setDelNote(null)} onConfirm={async () => { if (delNote) await deleteNote(delNote.id); setDelNote(null); }} />
    </div>
  );
}
