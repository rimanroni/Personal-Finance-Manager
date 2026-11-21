import { useEffect, useMemo, useState } from 'react';
import {
  Bell, CalendarDays, Camera, Check, CloudOff, CloudUpload, Database, Download, Globe,
  Languages, Lock, Moon, Palette, Pencil, RotateCcw, Sun, Tags, Trash2, Upload, Wallet, Repeat,
  Laptop, ShieldCheck, HardDrive, LogOut, UserRound, RefreshCw,
} from 'lucide-react';
import type { BackupMeta } from '../types';
import { useData, THEMES } from '../context/DataContext';
import { buildSnapshot, sealSnapshot } from '../lib/backup';
import { shrinkImage } from '../lib/image';
import { isGoogleSignInConfigured } from '../lib/googleConfig';
import * as drive from '../lib/drive';
import type { PageId } from '../components/Layout';
import { ConfirmDialog, Modal, PageHeader, SectionTitle } from '../components/ui';
import { DevFooter } from '../components/Layout';
import { localize } from '../lib/i18n';

type PassModalState =
  | { mode: 'restore'; name: string; text: string; driveId?: string }
  | { mode: 'upload' }
  | { mode: 'export' };

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.9 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.9c-.6 3-2.3 5.6-4.8 7.3l7.7 6c4.5-4.2 7.1-10.3 7.1-17.8z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.8 2.3-8.2 2.3-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function SettingsPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const {
    accounts, categories, transactions, notes, budgets, recurring, backups, settings,
    updateSettings, enableNotifications, testNotification, exportData, importData, resetAll,
    saveBackupMeta, deleteBackupMeta, showToast, runReminderCheck, lang,
  } = useData();
  const tx = (s: string) => localize(lang, s);

  const [profileOpen, setProfileOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.profileName);
  const [photoDraft, setPhotoDraft] = useState<string | undefined>(settings.profilePhoto);
  const [passModal, setPassModal] = useState<PassModalState | null>(null);
  const [pass, setPass] = useState('');
  const [exportEncrypted, setExportEncrypted] = useState(true);
  const [connected, setConnected] = useState(() => drive.isConnected());
  const [busy, setBusy] = useState(false);
  const [listing, setListing] = useState(false);
  const [driveFiles, setDriveFiles] = useState<drive.DriveFile[]>([]);
  const [resetOpen, setResetOpen] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    let alive = true;
    isGoogleSignInConfigured().then((ready) => { if (alive) setGoogleReady(ready); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { setNameDraft(settings.profileName); setPhotoDraft(settings.profilePhoto); }, [settings.profileName, settings.profilePhoto]);

  const snapshot = useMemo(() => buildSnapshot({
    accounts, categories, transactions, notes, budgets, recurring,
    settings: [settings], backups,
  }), [accounts, categories, transactions, notes, budgets, recurring, settings, backups]);

  const initials = (settings.profileName || 'User').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';

  const cloudBackups: drive.DriveFile[] = driveFiles.length
    ? driveFiles
    : backups.filter((b) => b.driveId).map((b) => ({
        id: b.driveId!, name: b.name, createdTime: b.createdAt, size: String(b.size),
      }));
  const backupCount = backups.filter((b) => b.driveId).length;

  const doGoogleSignIn = async () => {
    if (!googleReady) { showToast('Google sign-in is not configured for this deployment.'); return; }
    try {
      setBusy(true);
      const result = await drive.signInWithGoogle();
      if (result.status === 'cancelled') return;
      if (result.status === 'error') { showToast(result.message); return; }
      const profile = result.profile;
      await updateSettings({
        googleName: profile.name,
        googleEmail: profile.email,
        googlePhoto: profile.picture,
        profileName: !settings.profileName.trim() && profile.name ? profile.name : settings.profileName,
      });
      setConnected(true);
      showToast(`Signed in as ${profile.name}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally { setBusy(false); }
  };

  const handleDriveError = (e: unknown, fallback: string) => {
    if (drive.isGoogleAuthorizationError(e)) {
      setConnected(false);
      showToast(e instanceof Error ? e.message : 'Google authorization expired. Connect again.');
      return;
    }
    showToast(e instanceof Error ? e.message : fallback);
  };

  const doSignOut = () => {
    drive.disconnect();
    setConnected(false);
    setDriveFiles([]);
    updateSettings({ googleName: '', googleEmail: '', googlePhoto: '' });
    showToast('Disconnected from Google');
  };

  const listDriveBackups = async (notify = true) => {
    try {
      setListing(true);
      const files = await drive.listBackups();
      setDriveFiles(files);
      if (notify) showToast(files.length ? `${files.length} backup(s) found in Drive` : 'No backups found in your Drive app folder');
    } catch (e) {
      handleDriveError(e, 'Could not list Drive backups');
    } finally { setListing(false); }
  };

  const doUpload = async (passphrase: string) => {
    try {
      setBusy(true);
      const sealed = await sealSnapshot(snapshot);
      const { encryptBackup } = await import('../lib/crypto');
      const content = JSON.stringify(await encryptBackup(sealed, passphrase));
      const name = `pfm-backup-${new Date().toISOString().slice(0, 10)}-${Date.now()}-enc.json`;
      const file = await drive.uploadBackup(name, content);
      const meta: BackupMeta = {
        id: file.id, name: file.name, createdAt: file.createdTime, encrypted: true,
        size: Number(file.size || content.length), driveId: file.id,
      };
      await saveBackupMeta(meta);
      await updateSettings({ lastBackupAt: new Date().toISOString() });
      await listDriveBackups(false);
      showToast('Encrypted backup uploaded to Drive');
    } catch (e) {
      handleDriveError(e, 'Upload failed');
    } finally { setBusy(false); setPassModal(null); setPass(''); }
  };

  const doRestoreText = async (text: string, name: string, passphrase?: string) => {
    const ok = await importData(new File([text], name, { type: 'application/json' }), passphrase);
    if (ok) showToast('Backup restored');
  };

  return (
    <div className="animate-fade pb-6">
      <PageHeader title={tx('Settings')} subtitle={tx('Your data stays on this device')} />

      {/* Profile */}
      <div className="card mt-3 flex items-center gap-3">
        <button className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center display text-[15px] text-white"
          style={{ background: 'var(--primary)' }} onClick={() => setProfileOpen(true)}>
          {settings.profilePhoto ? <img src={settings.profilePhoto} alt="Profile" className="w-full h-full object-cover" /> : initials}
        </button>
        <div className="flex-1 min-w-0">
          <div className="display text-[13px] truncate">{settings.profileName || tx('Your name')}</div>
          <div className="tiny muted truncate">{settings.googleEmail || tx('Local data · No account needed')}</div>
        </div>
        <button className="icon-btn !w-8 !h-8 !rounded-xl" onClick={() => setProfileOpen(true)} title={tx('Change name / photo')}><Pencil size={14} /></button>
      </div>

      <div className="card mt-2 !py-1">
        <Row icon={UserRound} title={tx('Display name')} sub={tx('Shown on your dashboard')} right={settings.profileName} onClick={() => setProfileOpen(true)} />
        <Row icon={Camera} title={tx('Profile photo')} sub={settings.profilePhoto ? tx('Uploaded · tap to replace') : tx('Upload from your phone')} right={settings.profilePhoto ? tx('Change') : tx('Add')} onClick={() => setProfileOpen(true)} />
      </div>

      {/* Google account */}
      <div className="mt-6">
        <div className="tiny font-bold tracking-widest uppercase muted mb-2 px-1">{tx('Google Account')}</div>
        <div className="card">
          {connected ? (
            <>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-appbg flex items-center justify-center">
                  {settings.googlePhoto ? <img src={settings.googlePhoto} alt="Google profile" className="w-full h-full object-cover" /> : <GoogleG />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold truncate">{settings.googleName || tx('Google account')}</div>
                  <div className="tiny muted truncate">{settings.googleEmail}</div>
                </div>
                <span className="pill !text-[9px]" style={{ background: 'var(--income-soft)', color: 'var(--income)' }}><Check size={11} /> {tx('Connected')}</span>
              </div>
              <div className="tiny muted mt-3 text-center">{tx('Nothing is uploaded automatically. Drive is used only when you tap Backup or Restore.')}</div>
              <button className="btn-ghost w-full mt-2 !py-2 !text-[11px]" onClick={doSignOut}><LogOut size={14} /> {tx('Disconnect')}</button>
            </>
          ) : (
            <>
              <div className="tiny muted mb-3">{tx('Sign in with Google to unlock private backups. Your name, email and photo stay on this device.')}</div>
              <button className="w-full flex items-center justify-center gap-2.5 bg-card border border-line rounded-xl py-3 text-[13px] font-semibold active:scale-[.98] transition disabled:opacity-60"
                onClick={doGoogleSignIn} disabled={busy || !googleReady}>
                <GoogleG /> {busy ? tx('Opening Google…') : tx('Sign in with Google')}
              </button>
              {!googleReady && <div className="tiny muted mt-2 text-center">{tx('Google sign-in is not configured for this deployment.')}</div>}
              {settings.googleEmail && <div className="tiny muted mt-2 text-center">{tx('Last signed in as')} {settings.googleEmail}</div>}
            </>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="mt-6">
        <div className="tiny font-bold tracking-widest uppercase muted mb-2 px-1">{tx('Appearance · 18 Themes')}</div>
        <div className="card">
          <div className="tiny muted">{tx('Tap a color to change the whole app')}</div>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 mt-3">
            {THEMES.map((th, i) => (
              <button key={th.name} title={th.name} onClick={() => updateSettings({ theme: i })}
                className={`h-8 rounded-xl border-2 transition ${settings.theme === i ? 'border-[color:var(--ink)] scale-105' : 'border-transparent'}`}
                style={{ background: th.primary }} />
            ))}
          </div>
          <div className="text-center tiny mt-3 font-bold" style={{ color: 'var(--primary-dark)' }}>{THEMES[settings.theme]?.name}</div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-line">
            {([
              { id: 'light', label: tx('Light'), icon: Sun },
              { id: 'dark', label: tx('Dark'), icon: Moon },
              { id: 'system', label: tx('System'), icon: Laptop },
            ] as const).map((m) => {
              const Icon = m.icon;
              const active = settings.themeMode === m.id;
              return (
                <button key={m.id} onClick={() => updateSettings({ themeMode: m.id })}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-semibold ${active ? 'text-white border-transparent' : 'border-line muted'}`}
                  style={active ? { background: 'var(--primary)' } : undefined}>
                  <Icon size={14} />{m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="mt-6">
        <div className="tiny font-bold tracking-widest uppercase muted mb-2 px-1">{tx('Preferences')}</div>
        <div className="card !py-1">
          <Row icon={Database} title={tx('Currency')} sub={tx('Default currency')} right="BDT (৳)" onClick={() => showToast('Currency fixed to BDT')} />
          <div className="px-4 py-3 border-b border-line">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}><Languages size={15} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold">{tx('Language')}</div>
                <div className="tiny muted">{tx('Tap to switch')}</div>
              </div>
              <div className="flex rounded-xl border border-line overflow-hidden shrink-0">
                <button onClick={() => updateSettings({ language: 'en' })}
                  className={`px-3 py-1.5 text-[11px] font-bold ${settings.language === 'en' ? 'text-white' : 'muted'}`}
                  style={settings.language === 'en' ? { background: 'var(--primary)' } : undefined}>English</button>
                <button onClick={() => updateSettings({ language: 'bn' })}
                  className={`px-3 py-1.5 text-[11px] font-bold ${settings.language === 'bn' ? 'text-white' : 'muted'}`}
                  style={settings.language === 'bn' ? { background: 'var(--primary)' } : undefined}>বাংলা</button>
              </div>
            </div>
          </div>
          <Row icon={Globe} title={tx('Date format')} right={settings.dateFormat} onClick={() => showToast('Dates follow DD/MM/YYYY')} />
          <Row icon={Bell} title={tx('Notifications')} sub={tx('Native phone notifications on due dates')}
            right={
              <button onClick={async () => { if (settings.notificationsEnabled) { await updateSettings({ notificationsEnabled: false }); showToast(tx('Notifications off')); } else await enableNotifications(); }}
                className="w-9 h-5 rounded-full relative transition" style={{ background: settings.notificationsEnabled ? 'var(--primary)' : '#d7dedc' }}>
                <span className="absolute w-3.5 h-3.5 rounded-full bg-white top-[3px] shadow transition-all" style={{ left: settings.notificationsEnabled ? 18 : 3 }} />
              </button>} />
          {settings.notificationsEnabled && (
            <>
              <Row icon={Bell} title={tx('Test notification')} sub={tx('Send a sample right now')} right={tx('Send')} onClick={() => { testNotification(); runReminderCheck(); }} />
              <div className="tiny muted px-4 py-2 bg-appbg/60">{tx('Reminders fire when the app is open or installed. True background push needs a server.')}</div>
            </>
          )}
        </div>
      </div>

      {/* Manage */}
      <div className="mt-6">
        <div className="tiny font-bold tracking-widest uppercase muted mb-2 px-1">{tx('Manage')}</div>
        <div className="card !py-1">
          <Row icon={Tags} title={tx('Categories')} sub={`${categories.length} ${lang === 'bn' ? 'বিভাগ' : 'categories'}`} right="›" onClick={() => onNavigate('categories')} />
          <Row icon={Wallet} title={tx('Accounts')} sub={`${accounts.length} ${lang === 'bn' ? 'অ্যাকাউন্ট' : 'accounts'} · bKash, Nagad, Rocket…`} right="›" onClick={() => onNavigate('accounts')} />
          <Row icon={Repeat} title={tx('Recurring transactions')} sub={`${recurring.length} ${lang === 'bn' ? 'সময়সূচি' : 'schedules'}`} right="›" onClick={() => onNavigate('recurring')} />
          <Row icon={CalendarDays} title={tx('Calendar')} sub={tx('Day-wise history')} right="›" onClick={() => onNavigate('calendar')} />
        </div>
      </div>

      {/* Data & Security */}
      <div className="mt-6">
        <div className="tiny font-bold tracking-widest uppercase muted mb-2 px-1">{tx('Data & Security')}</div>
        <div className="card !py-1">
          <Row icon={HardDrive} title={tx('Local storage')} sub={`IndexedDB · ${accounts.length} ${lang === 'bn' ? 'অ্যাকাউন্ট' : 'accounts'} · ${transactions.length} ${lang === 'bn' ? 'লেনদেন' : 'transactions'}`}
            right={<span className="pill !text-[9px]" style={{ background: 'var(--income-soft)', color: 'var(--income)' }}>ON</span>}
            onClick={() => showToast(tx('Data never auto-deletes'))} />

          <Row icon={Download} title={tx('Export data')} sub={tx('Download JSON backup')} right="›" onClick={() => setPassModal({ mode: 'export' })} />
          <div className="px-4 py-2 bg-appbg/60 tiny muted flex items-center gap-2">
            <Lock size={13} /> {exportEncrypted ? tx('AES-256 encryption enabled for downloaded backups') : tx('Plain JSON download (no encryption)')}
            <button className="ml-auto font-semibold" style={{ color: 'var(--primary-dark)' }} onClick={() => setExportEncrypted((v) => !v)}>{exportEncrypted ? tx('Disable') : tx('Enable')}</button>
          </div>

          <Row icon={Upload} title={tx('Import data')} sub={tx('Validate before restoring')} right="›" onClick={() => document.getElementById('importFile')?.click()} />
          <input id="importFile" type="file" accept="application/json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const text = await f.text();
            if (text.includes('"encrypted":true')) setPassModal({ mode: 'restore', name: f.name, text });
            else await doRestoreText(text, f.name);
            e.target.value = '';
          }} />

          <Row icon={connected ? CloudUpload : CloudOff} title={tx('Google Drive backup')}
            sub={connected ? `${tx('Connected ·')} ${backupCount} ${tx('encrypted backup(s) · private appDataFolder')}` : tx('Sign in with Google to enable')}
            right={connected
              ? <button className="btn-soft !py-1.5 !px-2 !text-[10px]" disabled={busy} onClick={() => setPassModal({ mode: 'upload' })}>
                  {busy ? 'Uploading…' : tx('Backup now')}
                </button>
              : tx('Sign in')}
            onClick={connected ? undefined : doGoogleSignIn} />

          {connected && (
            <div className="px-4 py-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="tiny muted">{tx('Backups in your Drive')}</div>
                <button className="link !text-[10px] flex items-center gap-1" onClick={() => listDriveBackups()} disabled={listing}>
                  <RefreshCw size={11} className={listing ? 'animate-spin' : ''} /> {listing ? tx('Checking…') : tx('Refresh from Drive')}
                </button>
              </div>
              {cloudBackups.slice(0, 5).map((f) => {
                const encrypted = f.name.includes('-enc');
                const localId = backups.find((b) => b.driveId === f.id)?.id;
                return (
                  <div key={f.id} className="flex items-center gap-2 text-[11px]">
                    <ShieldCheck size={13} className="muted" />
                    <span className="flex-1 truncate muted">{f.name}</span>
                    <button className="link !text-[10px]" onClick={async () => {
                      try {
                        const text = await drive.downloadBackup(f.id);
                        if (encrypted) setPassModal({ mode: 'restore', name: f.name, text, driveId: f.id });
                        else await doRestoreText(text, f.name);
                      } catch (e) { handleDriveError(e, 'Download failed'); }
                    }}>{tx('Restore')}</button>
                    <button className="icon-btn !w-6 !h-6 !rounded-md" title={tx('Delete backup')}
                      onClick={async () => {
                        try {
                          await drive.deleteBackup(f.id);
                          if (localId) await deleteBackupMeta(localId);
                          setDriveFiles((prev) => prev.filter((x) => x.id !== f.id));
                          showToast('Drive backup deleted');
                        } catch (e) { handleDriveError(e, 'Delete failed'); }
                      }}><Trash2 size={11} /></button>
                  </div>
                );
              })}
              {cloudBackups.length === 0 && <div className="tiny muted">{tx('No cloud backups yet. Tap “Backup now”.')}</div>}
            </div>
          )}

          <Row icon={ShieldCheck} title={tx('Backup status')}
            sub={connected ? `Encrypted · ${backupCount} in Drive · ${settings.googleEmail || tx('Google account')}` : tx('Local only · Drive not connected')}
            right={<span className="pill !text-[9px]" style={{ background: connected ? 'var(--income-soft)' : 'var(--app-bg)', color: connected ? 'var(--income)' : 'var(--muted)' }}>{connected ? tx('Ready') : tx('Local')}</span>} />
          {settings.lastBackupAt && <div className="px-4 py-2 tiny muted">{lang === 'bn' ? 'শেষ ব্যাকআপ:' : 'Last backup:'} {new Date(settings.lastBackupAt).toLocaleString()}</div>}
        </div>
      </div>

      {/* Danger */}
      <div className="mt-6">
        <div className="tiny font-bold tracking-widest uppercase muted mb-2 px-1">{tx('Danger zone')}</div>
        <div className="card !py-1">
          <Row icon={RotateCcw} title={tx('Reset application')} sub={tx('Erases all local data and starts completely empty')}
            right={<span style={{ color: 'var(--expense)' }}>{tx('Reset')}</span>} onClick={() => setResetOpen(true)} />
        </div>
      </div>

      <div className="tiny muted text-center mt-5 leading-relaxed">{tx('Your data stays on this device. No tracking, no analytics, no uploads without your action.')}</div>
      <DevFooter compact />

      {/* Profile modal */}
      <Modal open={profileOpen} title={tx('Edit Profile')} onClose={() => setProfileOpen(false)}
        footer={<>
          <button className="btn-ghost flex-1" onClick={() => setProfileOpen(false)}>{tx('Cancel')}</button>
          <button className="btn-primary flex-1" onClick={async () => {
            if (!nameDraft.trim()) { showToast(lang === 'bn' ? 'নাম লিখুন' : 'Enter your name'); return; }
            await updateSettings({ profileName: nameDraft.trim(), profilePhoto: photoDraft });
            setProfileOpen(false);
            showToast(lang === 'bn' ? 'প্রোফাইল আপডেট হয়েছে' : 'Profile updated');
          }}>{tx('Save Profile')}</button>
        </>}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center display text-[16px] text-white" style={{ background: 'var(--primary)' }}>
              {photoDraft ? <img src={photoDraft} alt="Profile" className="w-full h-full object-cover" /> : initials}
            </div>
            <div>
              <label className="btn-soft !py-2 !px-3 !text-[11px] cursor-pointer"><Camera size={14} /> {tx('Upload photo')}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhotoDraft(await shrinkImage(f, 400, 0.8));
                }} />
              </label>
              {photoDraft && <button className="link !text-[10px] block mt-1" onClick={() => setPhotoDraft(undefined)}>{tx('Remove photo')}</button>}
            </div>
          </div>
          <div><div className="field-label mb-1">{tx('Display name')}</div><input className="input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder={tx('Your name')} /></div>
          <div className="tiny muted">{tx('Photo is compressed and stored only on this device.')}</div>
        </div>
      </Modal>

      {/* Passphrase modal */}
      <Modal open={!!passModal}
        title={passModal?.mode === 'restore' ? tx('Decrypt & Restore') : passModal?.mode === 'upload' ? tx('Encrypt & Upload to Drive') : exportEncrypted ? tx('Encrypt & Download') : tx('Download Backup')}
        onClose={() => setPassModal(null)}
        footer={<>
          <button className="btn-ghost flex-1" onClick={() => setPassModal(null)}>{tx('Cancel')}</button>
          <button className="btn-primary flex-1" onClick={async () => {
            if (!passModal) return;
            if (passModal.mode === 'restore') {
              if (!pass) { showToast(lang === 'bn' ? 'পাসফ্রেজ লিখুন' : 'Enter the passphrase'); return; }
              await doRestoreText(passModal.text, passModal.name, pass);
              setPassModal(null); setPass('');
            } else if (passModal.mode === 'upload') {
              if (pass.length < 4) { showToast(lang === 'bn' ? 'কমপক্ষে ৪টি অক্ষর ব্যবহার করুন' : 'Use at least 4 characters'); return; }
              await doUpload(pass);
            } else if (exportEncrypted) {
              if (pass.length < 4) { showToast(lang === 'bn' ? 'কমপক্ষে ৪টি অক্ষর ব্যবহার করুন' : 'Use at least 4 characters'); return; }
              await exportData(true, pass);
              setPassModal(null); setPass('');
            } else {
              await exportData(false);
              setPassModal(null); setPass('');
            }
          }}>{passModal?.mode === 'restore' ? tx('Restore') : passModal?.mode === 'upload' ? tx('Encrypt & Upload') : tx('Download')}</button>
        </>}>
        {passModal?.mode === 'restore' ? (
          <div><div className="field-label mb-1">{tx('Backup passphrase')}</div><input type="password" className="input" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={tx('The password you used when backing up')} /></div>
        ) : passModal?.mode === 'upload' ? (
          <>
            <div className="tiny muted mb-3">{tx('Your backup is encrypted with AES-256-GCM before it leaves this device. The passphrase is never stored — you need it to restore.')}</div>
            <div><div className="field-label mb-1">{tx('Passphrase')}</div><input type="password" className="input" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={tx('At least 4 characters')} /></div>
          </>
        ) : exportEncrypted ? (
          <>
            <div className="tiny muted mb-3">{tx('Choose a passphrase. It is never stored — you will need it to restore this backup.')}</div>
            <div><div className="field-label mb-1">{tx('Passphrase')}</div><input type="password" className="input" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={tx('At least 4 characters')} /></div>
          </>
        ) : <div className="tiny muted">{tx('A plain JSON file will be downloaded. Anyone with the file can read your data.')}</div>}
      </Modal>

      <ConfirmDialog open={resetOpen} title={tx('Reset application?')}
        message={tx('All local data will be erased. The app will start empty — only entries you add from now on will remain. Export a backup first if needed.')}
        confirmLabel={tx('Reset')} onCancel={() => setResetOpen(false)} onConfirm={async () => { await resetAll(); setResetOpen(false); }} />
    </div>
  );
}

function Row({ icon: Icon, title, sub, right, onClick }: {
  icon: typeof Bell; title: string; sub?: string; right?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className={`w-full flex items-center gap-3 py-3 px-4 border-b border-line last:border-0 text-left ${onClick ? 'cursor-pointer' : ''}`}>
      <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}><Icon size={15} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-semibold">{title}</span>
        {sub && <span className="block tiny muted truncate">{sub}</span>}
      </span>
      <span className="text-[11px] font-bold muted shrink-0">{right}</span>
    </div>
  );
}
