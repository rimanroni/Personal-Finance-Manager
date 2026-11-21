import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BarChart3, Bell, BellOff, CalendarDays,
  CreditCard, Home, Plus, ReceiptText, Repeat, Settings as SettingsIcon, Tags, Target,
  Wallet, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import { daysUntil, money } from '../lib/format';
import { localize } from '../lib/i18n';
import { haptic } from '../lib/haptic';
import { reminderDaysLabel } from '../lib/notifications';
import type { TxType } from '../types';

export type PageId = 'home' | 'transactions' | 'reports' | 'accounts' | 'settings' | 'allSettings' | 'budget' | 'calendar' | 'categories' | 'recurring';

const NAV: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'accounts', label: 'Accounts', icon: CreditCard },
  { id: 'budget', label: 'Budget', icon: Target },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'allSettings', label: 'All settings', icon: SettingsIcon },
];

const BOTTOM: PageId[] = ['home', 'transactions', 'reports', 'accounts', 'settings'];

function DevFooter({ compact = false }: { compact?: boolean }) {
  return (
    <button
      onClick={() => window.open('https://wa.me/8801326552304', '_blank', 'noopener')}
      className={`flex items-center gap-2 mx-auto opacity-60 hover:opacity-100 transition ${compact ? 'mt-6' : 'mt-auto pt-6'}`}
      title="Chat with developer"
    >
      <span className="w-6 h-6 rounded-full bg-white/15 text-white flex items-center justify-center display text-[9px]">RR</span>
      <span className="font-display text-[10px]" style={{ color: 'rgba(255,255,255,.6)' }}>Roni Riman</span>
      <span className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="white" strokeWidth="2.2"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.9-4.8A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" /></svg>
      </span>
    </button>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { transactions, notes, recurring, enableNotifications, settings, testNotification, showToast, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  const reminders = [
    ...transactions.filter((x) => x.reminderDate).map((x) => ({ id: x.id, due: x.reminderDate!, text: x.note || `${x.categoryId} · ${money(x.amount)}` })),
    ...notes.filter((x) => x.reminderDate).map((x) => ({ id: x.id, due: x.reminderDate!, text: x.text })),
    ...recurring.filter((x) => x.active).map((x) => ({ id: x.id, due: x.nextDate, text: `${x.note || x.categoryId} · ${money(x.amount)}` })),
  ].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 w-[300px] max-w-[86vw] card z-50 p-3 animate-drop">
        <div className="row mb-2 px-1">
          <div className="display text-[13px]">{tx('Reminders')}</div>
          <button className="icon-btn !w-7 !h-7" onClick={onClose}><X size={13} /></button>
        </div>
        {reminders.length === 0 && <div className="tiny muted py-3 text-center">{tx('No reminders saved yet.')}</div>}
        {reminders.map((r) => (
          <div key={r.id} className="flex items-start gap-2.5 py-2 border-b border-line last:border-0 first:border-0">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: daysUntil(r.due) <= 0 ? 'var(--expense-soft)' : 'var(--primary-soft)', color: daysUntil(r.due) <= 0 ? 'var(--expense)' : 'var(--primary-dark)' }}>
              <Bell size={14} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] leading-snug line-clamp-2 font-semibold">{r.text}</div>
              <div className="tiny" style={{ color: daysUntil(r.due) <= 0 ? 'var(--expense)' : 'var(--muted)' }}>{reminderDaysLabel(r.due)}</div>
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-2 pt-2">
          {!settings.notificationsEnabled ? (
            <button className="btn-soft flex-1 !py-2 !text-[10px]" onClick={() => { haptic(); enableNotifications(); onClose(); }}>{tx('Enable notifications')}</button>
          ) : (
            <button className="btn-ghost flex-1 !py-2 !text-[10px]" onClick={() => { haptic(); testNotification(); onClose(); }}>{tx('Test notification')}</button>
          )}
          <button className="btn-ghost !py-2 !text-[10px]" onClick={() => { showToast(tx('Set a reminder date in the transaction form')); onClose(); }}>{tx('How?')}</button>
        </div>
      </div>
    </>
  );
}

export function Layout({ page, setPage, onAdd, onNavigate, children }: {
  page: PageId;
  setPage: (p: PageId) => void;
  onAdd: (type?: TxType) => void;
  onNavigate: (p: PageId) => void;
  children: ReactNode;
}) {
  const [showNotif, setShowNotif] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const { transactions, settings, lang, t } = useData();
  const tx = (s: string) => localize(lang, s);
  const pending = transactions.filter((t) => t.reminderDate && daysUntil(t.reminderDate) <= 0).length;

  useEffect(() => { setFabOpen(false); }, [page]);

  const go = (p: PageId) => { haptic(); setPage(p); setFabOpen(false); };

  const fabActions: { id: string; label: string; icon: LucideIcon; color: string; run: () => void }[] = [
    { id: 'expense', label: t('expense'), icon: ArrowUpRight, color: 'var(--expense)', run: () => onAdd('expense') },
    { id: 'income', label: t('income'), icon: ArrowDownLeft, color: 'var(--income)', run: () => onAdd('income') },
    { id: 'transfer', label: t('transfer'), icon: ArrowLeftRight, color: 'var(--primary)', run: () => onAdd('transfer') },
    { id: 'accounts', label: t('accounts'), icon: Wallet, color: '#0ea5e9', run: () => onNavigate('accounts') },
  ];

  return (
    <div className="min-h-full lg:flex">
      {/* Desktop sidebar — deep navy, active item in accent */}
      <aside className="app-sidebar hidden lg:flex flex-col w-[246px] shrink-0 min-h-screen sticky top-0 border-r border-white/5">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-11 h-11 rounded-[15px] flex items-center justify-center text-white display text-xl"
            style={{ background: 'var(--primary)', boxShadow: '0 6px 16px -8px rgba(var(--primary-rgb),.95)' }}>৳</div>
          <div>
            <div className="display text-[15px] leading-tight text-white">Finance</div>
            <div className="tiny" style={{ color: 'rgba(255,255,255,.5)' }}>Manager</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => go(n.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[12px] font-bold transition-all duration-200 ${active ? 'text-white' : ''}`}
                style={active
                  ? { background: 'var(--primary)', boxShadow: '0 6px 16px -9px rgba(var(--primary-rgb),.95)' }
                  : { color: 'rgba(255,255,255,.58)' }}>
                <Icon size={17} />
                <span>{tx(n.label)}</span>
              </button>
            );
          })}
        </nav>
        <DevFooter />
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 pb-32 lg:pb-8">
        <header className="app-header sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 border-b border-white/5">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 rounded-[11px] flex items-center justify-center text-white display text-sm"
              style={{ background: 'var(--primary)' }}>৳</div>
            <div className="display text-[14px] text-white">{tx('Finance Manager')}</div>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 tiny" style={{ color: 'rgba(255,255,255,.5)' }}>
            {settings.notificationsEnabled ? <Bell size={13} /> : <BellOff size={13} />}
            {settings.notificationsEnabled ? tx('Notifications on') : tx('Notifications off')}
          </div>
          <div className="flex items-center gap-2 relative">
            <button className="shell-icon" onClick={() => setShowNotif((v) => !v)} aria-label={tx('Reminders')}>
              <Bell size={17} />
              {(pending > 0 || !settings.notificationsEnabled) && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--expense)' }} />}
            </button>
            <button className="shell-icon" onClick={() => { haptic(); onAdd('expense'); }} aria-label={tx('Add transaction')}><Plus size={18} /></button>
            {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
          </div>
        </header>

        <main key={page} className="px-4 sm:px-6 py-4 max-w-5xl mx-auto animate-page">
          {children}
        </main>
      </div>

      {fabOpen && <button className="fab-veil animate-veil lg:hidden" aria-label={tx('Close quick actions')} onClick={() => setFabOpen(false)} />}

      {/* Mobile floating dock */}
      <nav className="nav-dock lg:hidden">
        <div className="nav-dock-inner">
          {BOTTOM.map((id) => {
            const item = NAV.find((n) => n.id === id)!;
            const Icon = item.icon;
            const active = page === id;
            return (
              <button key={id} onClick={() => go(id)} className={`dock-item ${active ? 'on' : ''}`}>
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                <span>{tx(item.label)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Radial quick actions — one tap for every common entry */}
      <div className="fab-cluster lg:hidden" style={{ bottom: 'calc(88px + var(--safe-area-inset-bottom, 0px))' }}>
        {fabOpen && (
          <div className="fab-options">
            {fabActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <button key={a.id} className={`fab-option qa-${i + 1}`} style={{ background: a.color }}
                  onClick={() => { haptic(); setFabOpen(false); a.run(); }} aria-label={a.label}>
                  <span className="fab-option-label">{a.label}</span>
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        )}
        <button className={`fab-main ${fabOpen ? 'open' : ''}`}
          onClick={() => { haptic(); setFabOpen((v) => !v); }}
          aria-label={fabOpen ? tx('Close quick actions') : tx('Quick actions')}>
          {fabOpen ? <X size={22} /> : <Plus size={24} />}
        </button>
      </div>
    </div>
  );
}

export { DevFooter };
