import { Modal } from './ui';
import { privacyPolicy } from '../lib/legal';
import type { Lang } from '../lib/i18n';

export function PrivacyPolicyModal({ open, onClose, lang }: {
  open: boolean; onClose: () => void; lang: Lang;
}) {
  const bn = lang === 'bn';
  return (
    <Modal open={open} title={bn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'} onClose={onClose}
      footer={
        <button className="btn-primary flex-1" onClick={onClose}>
          {bn ? 'বুঝেছি' : 'Got it'}
        </button>
      }>
      <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed muted">{privacyPolicy(lang)}</pre>
    </Modal>
  );
}
