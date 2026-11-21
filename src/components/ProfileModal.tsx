import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { useData } from '../context/DataContext';
import { shrinkImage } from '../lib/image';
import { localize } from '../lib/i18n';
import { haptic } from '../lib/haptic';
import { Modal } from './ui';

/** Shared profile editor — reachable from Settings, Home and the mobile quick sheet. */
export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, showToast, lang } = useData();
  const tx = (s: string) => localize(lang, s);
  const [nameDraft, setNameDraft] = useState(settings.profileName);
  const [photoDraft, setPhotoDraft] = useState<string | undefined>(settings.profilePhoto);

  useEffect(() => {
    if (open) {
      setNameDraft(settings.profileName);
      setPhotoDraft(settings.profilePhoto);
    }
  }, [open, settings.profileName, settings.profilePhoto]);

  const initials = (settings.profileName || 'User').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';

  return (
    <Modal open={open} title={tx('Edit Profile')} onClose={onClose}
      footer={<>
        <button className="btn-ghost flex-1" onClick={onClose}>{tx('Cancel')}</button>
        <button className="btn-primary flex-1" onClick={async () => {
          if (!nameDraft.trim()) { showToast(lang === 'bn' ? 'নাম লিখুন' : 'Enter your name'); return; }
          haptic();
          await updateSettings({ profileName: nameDraft.trim(), profilePhoto: photoDraft });
          onClose();
          showToast(lang === 'bn' ? 'প্রোফাইল আপডেট হয়েছে' : 'Profile updated');
        }}>{tx('Save Profile')}</button>
      </>}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center display text-[16px] text-white" style={{ background: 'var(--primary)' }}>
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
        <div>
          <div className="field-label mb-1">{tx('Display name')}</div>
          <input className="input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder={tx('Your name')} autoFocus />
        </div>
      </div>
    </Modal>
  );
}
