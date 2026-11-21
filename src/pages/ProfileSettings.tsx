import { ChevronRight, Pencil } from 'lucide-react';
import { useData } from '../context/DataContext';
import { localize } from '../lib/i18n';
import { haptic } from '../lib/haptic';
import { PageHeader } from '../components/ui';
import type { PageId } from '../components/Layout';

/** Bottom-nav Settings stays profile-only: one card, one edit action. */
export function ProfileSettings({ onEditProfile, onNavigate }: {
  onEditProfile: () => void;
  onNavigate: (p: PageId) => void;
}) {
  const { settings, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  const initials = (settings.profileName || 'User').trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]?.toUpperCase()).join('') || 'U';

  return (
    <div className="animate-fade pb-6">
      <PageHeader title={tx('Profile')} subtitle={tx('Name & photo')} />

      <section className="card mt-4 p-5">
        <div className="flex flex-col items-center text-center">
          <button
            className="w-20 h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center display text-[22px] text-white"
            style={{ background: 'var(--primary)', boxShadow: '0 10px 24px -12px rgba(var(--primary-rgb),.9)' }}
            onClick={() => { haptic(); onEditProfile(); }}
            aria-label={tx('Edit profile')}
          >
            {settings.profilePhoto
              ? <img src={settings.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              : initials}
          </button>
          <div className="display text-[17px] mt-3">{settings.profileName || tx('Your name')}</div>
        </div>

        <button className="btn-primary w-full mt-5 !py-3" onClick={() => { haptic(); onEditProfile(); }}>
          <Pencil size={15} /> {tx('Edit profile')}
        </button>
      </section>

      <button
        className="w-full flex items-center gap-3 mt-3 rounded-[18px] bg-card p-4 text-left active:scale-[.99] transition"
        onClick={() => { haptic(); onNavigate('allSettings'); }}
      >
        <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}>
          <ChevronRight size={15} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[12px] font-bold">{tx('All settings')}</span>
          <span className="block tiny muted">{tx('Themes, notifications, backups, permissions')}</span>
        </span>
        <ChevronRight size={15} className="muted" />
      </button>
    </div>
  );
}
