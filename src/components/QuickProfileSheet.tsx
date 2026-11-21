import {
  Bell, Camera, CreditCard, Plus, Settings as SettingsIcon, Sparkles, X,
} from 'lucide-react';
import { useData, THEMES } from '../context/DataContext';
import { localize } from '../lib/i18n';
import { haptic } from '../lib/haptic';
import type { PageId } from './Layout';

/** One-tap profile + preferences sheet. Opens from the header avatar on mobile. */
export function QuickProfileSheet({ open, onClose, onNavigate, onEditProfile, onAdd }: {
  open: boolean;
  onClose: () => void;
  onNavigate: (p: PageId) => void;
  onEditProfile: () => void;
  onAdd: () => void;
}) {
  const { settings, updateSettings, enableNotifications, showToast, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  if (!open) return null;

  const initials = (settings.profileName || 'User').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';
  const go = (p: PageId) => { haptic(); onClose(); onNavigate(p); };

  const tiles = [
    { label: tx('Edit profile'), sub: tx('Name & photo'), icon: Camera, onClick: () => { haptic(); onClose(); onEditProfile(); }, tone: 'primary' },
    { label: tx('Settings'), sub: tx('All preferences'), icon: SettingsIcon, onClick: () => go('allSettings'), tone: 'soft' },
    { label: tx('Accounts'), sub: tx('bKash, Nagad, Bank'), icon: CreditCard, onClick: () => go('accounts'), tone: 'soft' },
    { label: tx('Add entry'), sub: tx('New transaction'), icon: Plus, onClick: () => { haptic(); onClose(); onAdd(); }, tone: 'accent' },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 animate-veil" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-md bg-card rounded-t-[26px] p-5 pb-7 animate-sheet shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" />
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center display text-[16px] text-white" style={{ background: 'var(--primary)' }}>
            {settings.profilePhoto ? <img src={settings.profilePhoto} alt="Profile" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="display text-[16px] truncate">{settings.profileName || tx('Your name')}</div>
            <div className="tiny muted truncate">{settings.googleEmail || tx('Local data · No account needed')}</div>
          </div>
          <button className="icon-btn !w-8 !h-8" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-5">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.label} onClick={t.onClick}
                className="flex items-center gap-2.5 text-left rounded-[18px] p-3 bg-app-bg active:scale-[.97] transition">
                <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: t.tone === 'primary' ? 'var(--primary)' : t.tone === 'accent' ? 'var(--expense-soft)' : 'var(--primary-soft)',
                    color: t.tone === 'primary' ? '#fff' : t.tone === 'accent' ? 'var(--expense)' : 'var(--primary-dark)',
                  }}><Icon size={15} /></span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-extrabold truncate">{t.label}</span>
                  <span className="block tiny muted truncate">{t.sub}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="group-label">{tx('Quick theme')}</div>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2">
              {THEMES.slice(0, 6).map((th, i) => (
                <button key={th.name} title={th.name} onClick={() => { haptic(); updateSettings({ theme: i }); }}
                  className={`w-8 h-8 rounded-full border-2 transition ${settings.theme === i ? 'border-[color:var(--ink)] scale-110' : 'border-transparent'}`}
                  style={{ background: th.primary }} />
              ))}
            </div>
            <button className="link !text-[10px]" onClick={() => go('allSettings')}>{tx('All 18')} ›</button>
          </div>
        </div>

        <div className="mt-5">
          <div className="group-label">{tx('Quick language')}</div>
          <div className="segment">
            <button className={`seg ${settings.language === 'en' ? 'on' : ''}`} onClick={() => { haptic(); updateSettings({ language: 'en' }); }}>English</button>
            <button className={`seg ${settings.language === 'bn' ? 'on' : ''}`} onClick={() => { haptic(); updateSettings({ language: 'bn' }); }}>বাংলা</button>
          </div>
        </div>

        <button className="w-full flex items-center gap-3 mt-5 rounded-[18px] bg-app-bg p-3 text-left"
          onClick={async () => {
            haptic();
            if (settings.notificationsEnabled) {
              await updateSettings({ notificationsEnabled: false });
              showToast(tx('Notifications off'));
            } else await enableNotifications();
          }}>
          <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}><Bell size={15} /></span>
          <span className="flex-1 text-[11px] font-extrabold">{tx('Payment reminders')}</span>
          <span className="w-9 h-5 rounded-full relative transition shrink-0" style={{ background: settings.notificationsEnabled ? 'var(--primary)' : '#cbd3e4' }}>
            <span className="absolute w-3.5 h-3.5 rounded-full bg-white top-[3px] shadow transition-all" style={{ left: settings.notificationsEnabled ? 18 : 3 }} />
          </span>
        </button>

        <div className="tiny muted text-center mt-4 flex items-center justify-center gap-1.5">
          <Sparkles size={12} /> {tx('Your data stays on this device')}
        </div>
      </div>
    </div>
  );
}
