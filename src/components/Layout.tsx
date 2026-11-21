import { useState, type ReactNode } from 'react';
import {
  BarChart3, Bell, CalendarDays, CreditCard, Home, Plus, ReceiptText, Repeat,
  Settings as SettingsIcon, Tags, Target, Wallet, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import { daysUntil, money } from '../lib/format';
import { reminderDaysLabel } from '../lib/notifications';

export type PageId = 'home' | 'transactions' | 'reports' | 'accounts' | 'settings' | 'budget' | 'calendar' | 'categories' | 'recurring';

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
];

const BOTTOM: PageId[] = ['home', 'transactions', 'reports', 'accounts', 'settings'];

function DevFooter({ compact = false }: { compact?: boolean }) {
  return (
    <button
      onClick={() => window.open('https://wa.me/8801326552304', '_blank', 'noopener')}
      className={`flex items-center gap-2 mx-auto opacity-60 hover:opacity-100 transition ${compact ? 'mt-6' : 'mt-auto pt-6'}`}
      title="Chat with developer"
    >
      <span className="w-6 h-6 rounded-lg bg-ink text-white flex items-center justify-center display text-[9px]">RR</span>
      <span className="font-display text-[10px] muted">Roni Riman</span>
      <span className="w-5 h-5 rounded-lg bg-[#25D366] flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="white" strokeWidth="2.2"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.9-4.8A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" /></svg>
      </span>
    </button>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { transactions, notes, recurring, enableNotifications, settings, testNotification, showToast } = useData();
  const reminders = [
    ...transactions.filter((x) => x.reminderDate).map((x) => ({ id: x.id, due: x.reminderDate!, text: x.note || `${x.categoryId} · ${money(x.amount)}` })),
    ...notes.filter((x) => x.reminderDate).map((x) => ({ id: x.id, due: x.reminderDate!, text: x.text })),
    ...recurring.filter((x) => x.active).map((x) => ({ id: x.id, due: x.nextDate, text: `${x.note || x.categoryId} · ${money(x.amount)}` })),
  ].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
  const hasDue = reminders.some((r) => daysUntil(r.due) <= 0);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-11 w-[300px] max-w-[86vw] bg-card border border-line rounded-2xl shadow-xl z-50 p-3 animate-drop">
        <div className="row mb-2">
          <div className="display text-[13px]">Reminders</div>
          <button className="icon-btn !w-6 !h-6 !rounded-md" onClick={onClose}><X size={12} /></button>
        </div>
        {reminders.length === 0 && <div className="tiny muted py-3 text-center">No reminders saved yet.</div>}
        {reminders.map((r) => (
          <div key={r.id} className="flex items-start gap-2 py-2 border-t border-line first:border-0">
            <span className="text-base">⏰</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] leading-snug line-clamp-2">{r.text}</div>
              <div className="tiny" style={{ color: daysUntil(r.due) <= 0 ? 'var(--expense)' : 'var(--muted)' }}>{reminderDaysLabel(r.due)}</div>
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-2 pt-2 border-t border-line">
          {!settings.notificationsEnabled ? (
            <button className="btn-soft flex-1 !py-2 !text-[11px]" onClick={() => { enableNotifications(); onClose(); }}>Enable notifications</button>
          ) : (
            <button className="btn-ghost flex-1 !py-2 !text-[11px]" onClick={() => { testNotification(); onClose(); }}>Test notification</button>
          )}
          <button className="btn-ghost !py-2 !text-[11px]" onClick={() => { showToast('Set a reminder date in the transaction form'); onClose(); }}>How?</button>
        </div>
      </div>
    </>
  );
}

export function Layout({ page, setPage, onAdd, children }: {
  page: PageId; setPage: (p: PageId) => void; onAdd: () => void; children: ReactNode;
}) {
  const [showNotif, setShowNotif] = useState(false);
  const { accounts, transactions, settings, showToast } = useData();
  const total = accounts.reduce((s, a) => s + a.openingBalance, 0);
  const pending = transactions.filter((t) => t.reminderDate && daysUntil(t.reminderDate) <= 0).length;
  const initials = (settings.profileName || 'User').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';

  return (
    <div className="min-h-full lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[248px] shrink-0 min-h-screen sticky top-0 border-r border-line bg-card px-4 py-6">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white display text-lg" style={{ background: 'var(--primary)' }}>৳</div>
          <div>
            <div className="display text-[14px] leading-tight">Finance</div>
            <div className="tiny muted">Manager</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${active ? 'text-white' : 'muted hover:bg-appbg hover:translate-x-0.5'}`}
                style={active ? {
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  boxShadow: '0 10px 22px -14px rgba(var(--primary-rgb), .9)',
                } : undefined}>
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/85" />}
                <Icon size={18} className={`relative transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
                <span className="relative">{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-6 px-3 py-3 rounded-2xl bg-appbg">
          <div className="tiny muted">Local balance</div>
          <div className="num text-[16px] mt-0.5">{money(total)}</div>
          <button className="link text-[11px] mt-2" onClick={() => showToast(`${accounts.length} accounts · ${transactions.length} entries on this device`)}>View details</button>
        </div>
        <DevFooter />
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 pb-24 lg:pb-8">
        <header className="sticky top-0 z-30 bg-appbg/85 backdrop-blur-xl border-b border-line/70 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white display text-sm" style={{ background: 'var(--primary)' }}>৳</div>
            <div className="display text-[14px]">Finance Manager</div>
          </div>
          <div className="hidden lg:block tiny muted">{settings.notificationsEnabled ? '🔔 Notifications on · Local data only' : '🔕 Notifications off · Local data only'}</div>
          <div className="flex items-center gap-2 relative">
            <button className="icon-btn" onClick={() => setShowNotif((v) => !v)} aria-label="Notifications">
              <Bell size={17} />
              {(pending > 0 || !settings.notificationsEnabled) && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--expense)' }} />}
            </button>
            <button className="icon-btn" onClick={onAdd} aria-label="Add transaction"><Plus size={18} /></button>
            <button className="avatar overflow-hidden shrink-0" onClick={() => setPage('settings')} title="Profile & settings">
              {settings.profilePhoto
                ? <img src={settings.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                : initials}
            </button>
            {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
          </div>
        </header>

        <main key={page} className="px-4 sm:px-6 py-4 max-w-5xl mx-auto animate-page">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-line flex items-center justify-around px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))]">
        {BOTTOM.map((id) => {
          const item = NAV.find((n) => n.id === id)!;
          const Icon = item.icon;
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} className="relative flex flex-col items-center gap-0.5 w-1/5 py-1.5"
              style={{ color: active ? 'var(--primary-dark)' : 'var(--muted)' }}>
              <span className={`absolute inset-x-1 inset-y-0 rounded-xl bg-primary-soft transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`} />
              <Icon size={20} strokeWidth={active ? 2.5 : 2}
                className={`relative z-10 transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : ''}`} />
              <span className="relative z-10 text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button onClick={onAdd} className="lg:hidden fixed right-4 bottom-20 z-30 w-13 h-13 rounded-2xl p-3.5 text-white shadow-lg active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
        style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', boxShadow: '0 12px 28px -12px rgba(var(--primary-rgb), .9)' }} aria-label="Add transaction">
        <Plus size={22} />
      </button>
    </div>
  );
}

export { DevFooter };
