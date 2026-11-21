import { useEffect, useState } from 'react';
import { ArrowRight, Bell, Camera, Check, Cloud, Lock, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext';
import { shrinkImage } from '../lib/image';
import { isGoogleSignInConfigured } from '../lib/googleConfig';
import * as drive from '../lib/drive';

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.9 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.9c-.6 3-2.3 5.6-4.8 7.3l7.7 6c4.5-4.2 7.1-10.3 7.1-17.8z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.8 2.3-8.2 2.3-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function Onboarding() {
  const { settings, updateSettings, completeOnboarding, enableNotifications, showToast } = useData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.profileName || '');
  const [photo, setPhoto] = useState<string | undefined>(settings.profilePhoto);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(() => drive.isConnected());
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    let alive = true;
    isGoogleSignInConfigured().then((ready) => { if (alive) setGoogleReady(ready); });
    return () => { alive = false; };
  }, []);

  const initials = (name || 'U').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';

  const saveProfile = async (skip = false) => {
    if (!name.trim() && !skip) { showToast('Enter your name to continue'); return; }
    const finalName = name.trim() || 'Friend';
    await updateSettings({ profileName: finalName, profilePhoto: photo });
    setName(finalName);
    setStep(2);
  };

  const signIn = async () => {
    if (!googleReady) { showToast('Google sign-in is not configured for this deployment.'); return; }
    try {
      setBusy(true);
      const result = await drive.signInWithGoogle();
      if (result.status === 'cancelled') return;
      if (result.status === 'error') { showToast(result.message); return; }
      const profile = result.profile;
      await updateSettings({
        googleName: profile.name, googleEmail: profile.email, googlePhoto: profile.picture,
        profileName: name.trim() || profile.name,
      });
      setName(name.trim() || profile.name);
      setSignedIn(true);
      showToast(`Welcome, ${profile.name.split(' ')[0]}!`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally { setBusy(false); }
  };

  const finish = async () => { await completeOnboarding(); };

  return (
    <div className="onboarding-shell fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-sm bg-card rounded-[28px] shadow-2xl p-6 relative animate-pop my-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white display text-lg" style={{ background: 'var(--primary)' }}>৳</div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1.5 rounded-full transition-all"
                style={{ width: i === step ? 20 : 6, background: i <= step ? 'var(--primary)' : 'var(--line)' }} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="animate-fade text-center">
            <div className="text-5xl mb-3">👋</div>
            <h1 className="display text-[24px] leading-tight">Welcome to your<br />money space</h1>
            <p className="tiny muted mt-2 leading-relaxed">A beautiful, private place to track every taka — bKash, Nagad, Bank and more.</p>
            <div className="space-y-2 mt-6 text-left">
              {[
                { icon: Lock, text: '100% private · data never leaves this device' },
                { icon: Wallet, text: 'Every wallet separate, day-wise history' },
                { icon: Bell, text: 'Reminders that feel like phone notifications' },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.text} className="flex items-center gap-3 bg-appbg rounded-2xl px-3 py-2.5">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}><Icon size={15} /></span>
                    <span className="text-[11px] font-semibold">{f.text}</span>
                  </div>
                );
              })}
            </div>
            <button className="btn-primary w-full mt-6" onClick={() => setStep(1)}>Get started <ArrowRight size={16} /></button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade">
            <div className="text-3xl mb-2">😊</div>
            <h2 className="display text-[21px]">What should we call you?</h2>
            <p className="tiny muted mt-1">This appears on your dashboard. You can change it anytime.</p>
            <div className="flex flex-col items-center gap-3 mt-6">
              <label className="w-20 h-20 rounded-[24px] overflow-hidden shrink-0 flex items-center justify-center display text-[24px] text-white cursor-pointer relative"
                style={{ background: 'var(--primary)' }}>
                {photo ? <img src={photo} alt="Profile" className="w-full h-full object-cover" /> : initials}
                <span className="absolute bottom-0 right-0 w-7 h-7 rounded-lg bg-card border border-line flex items-center justify-center" style={{ color: 'var(--primary-dark)' }}><Camera size={13} /></span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhoto(await shrinkImage(f, 400, 0.8));
                }} />
              </label>
              <div className="tiny muted">Tap to add a photo (optional)</div>
              {photo && <button className="link !text-[10px]" onClick={() => setPhoto(undefined)}>Remove photo</button>}
            </div>
            <div className="mt-5">
              <div className="field-label mb-1">Your name</div>
              <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahim Ahmed" onKeyDown={(e) => { if (e.key === 'Enter') saveProfile(); }} />
            </div>
            <button className="btn-primary w-full mt-5" onClick={() => saveProfile()}>Continue <ArrowRight size={16} /></button>
            <button className="link text-[11px] block mx-auto mt-3" onClick={() => saveProfile(true)}>Skip for now</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade">
            <div className="text-3xl mb-2">☁️</div>
            <h2 className="display text-[21px]">Connect your Google account</h2>
            <p className="tiny muted mt-1 leading-relaxed">Optional. Sign in to unlock encrypted backup. Your data stays local otherwise.</p>

            {signedIn ? (
              <div className="bg-appbg rounded-2xl p-4 mt-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-card mx-auto flex items-center justify-center shadow-sm"><Check size={22} color="var(--income)" /></div>
                <div className="text-[13px] font-bold mt-2">Connected with Google</div>
                <div className="tiny muted truncate">{settings.googleEmail}</div>
              </div>
            ) : (
              <>
                <button className="w-full flex items-center justify-center gap-2.5 bg-card border border-line rounded-xl py-3 text-[13px] font-semibold mt-6 active:scale-[.98] transition disabled:opacity-60"
                  onClick={signIn} disabled={busy || !googleReady}>
                  <GoogleG /> {busy ? 'Opening Google…' : 'Sign in with Google'}
                </button>
                {!googleReady && <div className="tiny muted mt-2 text-center">Google sign-in is not configured for this deployment.</div>}
              </>
            )}

            <button className="btn-primary w-full mt-5" onClick={() => setStep(3)}>Continue <ArrowRight size={16} /></button>
            <button className="link text-[11px] block mx-auto mt-3" onClick={() => setStep(3)}>Skip for now</button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="display text-[23px]">You're all set{name ? `, ${name.trim().split(/\s+/)[0]}` : ''}!</h2>
            <p className="tiny muted mt-2 leading-relaxed">Your private finance space is ready. No demo entries — start clean, and add only what you actually use.</p>
            <div className="flex justify-center gap-3 mt-5">
              <span className="pill !py-2 !px-3" style={{ background: 'var(--income-soft)', color: 'var(--income)' }}><ShieldCheck size={12} /> Private</span>
              <span className="pill !py-2 !px-3" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}><Cloud size={12} /> {signedIn ? 'Backed up' : 'Offline'}</span>
              <span className="pill !py-2 !px-3" style={{ background: 'var(--app-bg)', color: 'var(--muted)' }}><Sparkles size={12} /> Ready</span>
            </div>
            <button className="btn-ghost w-full mt-4 !py-2.5 !text-[11px]" onClick={async () => { await enableNotifications(); showToast('Reminders enabled'); }}>
              <Bell size={14} /> Enable payment reminders
            </button>
            <button className="btn-primary w-full mt-3" onClick={finish}>Open my dashboard <ArrowRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
