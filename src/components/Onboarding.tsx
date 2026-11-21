import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Bell, Camera, Check, Cloud, Lock, Sparkles, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext';
import { shrinkImage } from '../lib/image';
import { localize } from '../lib/i18n';
import { isGoogleSignInConfigured } from '../lib/googleConfig';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
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

function StepIcon({ children }: { children: ReactNode }) {
  return (
    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3"
      style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}>
      {children}
    </div>
  );
}

export function Onboarding() {
  const { settings, updateSettings, completeOnboarding, enableNotifications, showToast, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.profileName || '');
  const [photo, setPhoto] = useState<string | undefined>(settings.profilePhoto);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(() => drive.isConnected());
  const [googleReady, setGoogleReady] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

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
      <div className="w-full max-w-sm bg-card rounded-[26px] shadow-2xl p-6 relative animate-pop my-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white display text-lg"
            style={{ background: 'var(--primary)', boxShadow: '0 6px 16px -8px rgba(var(--primary-rgb),.95)' }}>৳</div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1.5 rounded-full transition-all"
                style={{ width: i === step ? 22 : 6, background: i <= step ? 'var(--primary)' : 'var(--line)' }} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="animate-fade text-center">
            <StepIcon><Wallet size={30} /></StepIcon>
            <h1 className="display text-[23px] leading-tight">
              {lang === 'bn' ? <>আপনার টাকার<br />নিজস্ব জগৎ</> : <>Welcome to your<br />money space</>}
            </h1>
            <p className="tiny muted mt-2 leading-relaxed">{tx('A beautiful, private place to track every taka — bKash, Nagad, Bank and more.')}</p>

            <div className="mt-4 text-left">
              <div className="tiny font-bold muted mb-1.5">{lang === 'bn' ? 'ভাষা বাছুন' : 'Choose your language'}</div>
              <div className="segment">
                <button onClick={() => updateSettings({ language: 'en' })} className={`seg ${settings.language === 'en' ? 'on' : ''}`}>English</button>
                <button onClick={() => updateSettings({ language: 'bn' })} className={`seg ${settings.language === 'bn' ? 'on' : ''}`}>বাংলা</button>
              </div>
            </div>

            <div className="space-y-2 mt-5 text-left">
              {[
                { icon: Lock, text: tx('100% private · data never leaves this device') },
                { icon: Wallet, text: tx('Every wallet separate, day-wise history') },
                { icon: Bell, text: tx('Reminders that feel like phone notifications') },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.text} className="flex items-center gap-3 bg-app-bg rounded-2xl px-3 py-2.5">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}><Icon size={15} /></span>
                    <span className="text-[11px] font-bold">{f.text}</span>
                  </div>
                );
              })}
            </div>
            <button className="btn-primary w-full mt-6" onClick={() => setStep(1)}>{tx('Get started')} <ArrowRight size={16} /></button>
            <button className="link text-[10px] block mx-auto mt-3" onClick={() => setPrivacyOpen(true)}>
              {lang === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy policy'}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade">
            <StepIcon><Camera size={28} /></StepIcon>
            <h2 className="display text-[21px]">{tx('What should we call you?')}</h2>
            <p className="tiny muted mt-1">{tx('This appears on your dashboard. You can change it anytime.')}</p>
            <div className="flex flex-col items-center gap-3 mt-6">
              <label className="w-20 h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center display text-[24px] text-white cursor-pointer relative"
                style={{ background: 'var(--primary)' }}>
                {photo ? <img src={photo} alt="Profile" className="w-full h-full object-cover" /> : initials}
                <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-card border border-line flex items-center justify-center" style={{ color: 'var(--primary-dark)' }}><Camera size={13} /></span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhoto(await shrinkImage(f, 400, 0.8));
                }} />
              </label>
              <div className="tiny muted">{tx('Tap to add a photo (optional)')}</div>
              {photo && <button className="link !text-[10px]" onClick={() => setPhoto(undefined)}>{tx('Remove photo')}</button>}
            </div>
            <div className="mt-5">
              <div className="field-label mb-1">{tx('Your name')}</div>
              <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === 'bn' ? 'যেমন: রহিম আহমেদ' : 'e.g. Rahim Ahmed'} onKeyDown={(e) => { if (e.key === 'Enter') saveProfile(); }} />
            </div>
            <button className="btn-primary w-full mt-5" onClick={() => saveProfile()}>{tx('Continue')} <ArrowRight size={16} /></button>
            <button className="link text-[11px] block mx-auto mt-3" onClick={() => saveProfile(true)}>{tx('Skip for now')}</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade">
            <StepIcon><Cloud size={28} /></StepIcon>
            <h2 className="display text-[21px]">{tx('Connect your Google account')}</h2>
            <p className="tiny muted mt-1 leading-relaxed">{tx('Sign in only if you want encrypted Drive backup.')}</p>

            {signedIn ? (
              <div className="bg-app-bg rounded-[18px] p-4 mt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-card mx-auto flex items-center justify-center shadow-sm"><Check size={22} color="var(--income)" /></div>
                <div className="text-[13px] font-extrabold mt-2">{tx('Connected with Google')}</div>
                <div className="tiny muted truncate">{settings.googleEmail}</div>
              </div>
            ) : (
              <>
                <button className="w-full flex items-center justify-center gap-2.5 bg-app-bg rounded-full py-3 text-[12px] font-extrabold mt-6 active:scale-[.98] transition disabled:opacity-60"
                  onClick={signIn} disabled={busy || !googleReady}>
                  <GoogleG /> {busy ? tx('Opening Google…') : tx('Sign in with Google')}
                </button>
                {!googleReady && <div className="tiny muted mt-2 text-center">{tx('Google sign-in is not configured for this deployment.')}</div>}
              </>
            )}

            <button className="btn-primary w-full mt-5" onClick={() => setStep(3)}>{tx('Continue')} <ArrowRight size={16} /></button>
            <button className="link text-[11px] block mx-auto mt-3" onClick={() => setStep(3)}>{tx('Skip for now')}</button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade text-center">
            <StepIcon><Sparkles size={30} /></StepIcon>
            <h2 className="display text-[22px]">
              {lang === 'bn' ? 'সব প্রস্তুত!' : "You're all set"}{name ? `, ${name.trim().split(/\s+/)[0]}` : ''}!
            </h2>
            <p className="tiny muted mt-2 leading-relaxed">{tx('All set. Start clean and add only the entries you use.')}</p>
            <div className="flex justify-center gap-3 mt-5">
              <span className="pill !py-2 !px-3" style={{ background: 'var(--primary-soft)', color: 'var(--primary-dark)' }}><Cloud size={12} /> {signedIn ? (lang === 'bn' ? 'ব্যাকআপ আছে' : 'Backed up') : (lang === 'bn' ? 'অফলাইন' : 'Offline')}</span>
              <span className="pill !py-2 !px-3" style={{ background: 'var(--app-bg)', color: 'var(--muted)' }}><Sparkles size={12} /> {lang === 'bn' ? 'প্রস্তুত' : 'Ready'}</span>
            </div>
            <button className="btn-ghost w-full mt-4 !py-2.5 !text-[11px]" onClick={async () => { await enableNotifications(); showToast(lang === 'bn' ? 'রিমাইন্ডার চালু হয়েছে' : 'Reminders enabled'); }}>
              <Bell size={14} /> {lang === 'bn' ? 'পেমেন্ট রিমাইন্ডার চালু করুন' : 'Enable payment reminders'}
            </button>
            <button className="btn-primary w-full mt-3" onClick={finish}>{lang === 'bn' ? 'ড্যাশবোর্ড খুলুন' : 'Open my dashboard'} <ArrowRight size={16} /></button>
          </div>
        )}
      </div>

      <PrivacyPolicyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} lang={lang} />
    </div>
  );
}
