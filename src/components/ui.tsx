import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Briefcase, Car, CircleEllipsis, Clapperboard, Gift,
  GraduationCap, HeartPulse, Laptop, ReceiptText, ShoppingBag, TrendingUp, Utensils,
  Users, Wallet, X, Check, AlertTriangle, ChevronLeft, ChevronRight, PartyPopper,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import { money } from '../lib/format';
import { monthName } from '../lib/format';
import { shiftMonth } from '../lib/format';

const ICONS: Record<string, LucideIcon> = {
  Utensils, ShoppingBag, Car, ReceiptText, HeartPulse, GraduationCap, Clapperboard,
  Users, Briefcase, CircleEllipsis, Wallet, Laptop, Gift, TrendingUp,
};

export function CategoryIcon({ name, size = 17 }: { name?: string; size?: number }) {
  const C = ICONS[name || ''] || CircleEllipsis;
  return <C size={size} />;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: ReactNode; onAction?: () => void }) {
  return (
    <div className="section-title">
      <span>{title}</span>
      {action && <button className="link" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="row mb-1 pt-1">
      <div>
        <div className="h-title">{title}</div>
        {subtitle && <div className="tiny muted">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/** Smoothly counts to the latest total. First paint is instant; only changes animate. */
export function AnimatedMoney({ value, compact = false, className, duration = 650 }: {
  value: number; compact?: boolean; className?: string; duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    if (Math.abs(from - value) < 0.01) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (value - from) * eased;
      current.current = next;
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{money(shown, compact)}</span>;
}

export function EmptyState({ text, icon, actionLabel, onAction }: {
  text: string; icon?: ReactNode; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="card text-center py-8">
      <div className="text-3xl mb-2">{icon || '📭'}</div>
      <div className="small muted px-4">{text}</div>
      {actionLabel && onAction && <button className="btn-primary !py-2 !px-4 !text-[11px] mt-4" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

export function MonthSwitcher() {
  const { month, setMonth, lang } = useData();
  return (
    <div className="flex items-center gap-2 mt-4">
      <button className="icon-btn !w-7 !h-7 !rounded-lg" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft size={15} />
      </button>
      <div className="flex-1 text-center display text-[13px]">{monthName(month, lang)}</div>
      <button className="icon-btn !w-7 !h-7 !rounded-lg" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

export function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'income' | 'expense' | 'primary' }) {
  const color = tone === 'income' ? 'var(--income)' : tone === 'expense' ? 'var(--expense)' : tone === 'primary' ? 'var(--primary-dark)' : undefined;
  return (
    <div className="card-tight flex-1">
      <div className="tiny muted">{label}</div>
      <div className="num text-[15px] mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

export function Donut({ data, size = 96, centerLabel }: { data: { name: string; value: number; color: string }[]; size?: number; centerLabel?: string }) {
  const top = data.slice(0, 4);
  const rest = data.slice(4).reduce((s, x) => s + x.value, 0);
  const list = rest > 0 ? [...top, { name: 'Other', value: rest, color: '#64748b' }] : top;
  const total = list.reduce((s, x) => s + x.value, 0);
  let cum = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" className="shrink-0">
      <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--line)" strokeWidth="5" />
      {list.map((x, i) => {
        const pct = total ? (x.value / total) * 100 : 0;
        const el = (
          <circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={x.color} strokeWidth="5"
            strokeDasharray={`${pct.toFixed(2)} ${(100 - pct).toFixed(2)}`}
            strokeDashoffset={(25 - cum).toFixed(2)} strokeLinecap="butt" />
        );
        cum += pct;
        return el;
      })}
      <text x="21" y="21.5" textAnchor="middle" fontSize="5.4" fontWeight="800" fill="var(--ink)" fontFamily="Plus Jakarta Sans">
        {centerLabel || (total >= 1000 ? `৳${(total / 1000).toFixed(1)}k` : `৳${Math.round(total)}`)}
      </text>
    </svg>
  );
}

export function CategoryLegend({ data }: { data: { name: string; value: number; color: string }[] }) {
  const top = data.slice(0, 4);
  const rest = data.slice(4).reduce((s, x) => s + x.value, 0);
  const list = rest > 0 ? [...top, { name: 'Other', value: rest, color: '#64748b' }] : top;
  const total = list.reduce((s, x) => s + x.value, 0);
  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      {list.length === 0 && <div className="tiny muted">No spending this month</div>}
      {list.map((x) => (
        <div key={x.name} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: x.color }} />
          <span className="flex-1 truncate">{x.name}</span>
          <span className="num !text-[10px] muted">{money(x.value, true)} · {total ? Math.round((x.value / total) * 100) : 0}%</span>
        </div>
      ))}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm animate-veil" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-md bg-card rounded-t-[24px] sm:rounded-[24px] p-5 max-h-[90vh] overflow-y-auto animate-sheet relative shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-line mx-auto mb-3 sm:hidden" />
        <button className="icon-btn !w-7 !h-7 !rounded-lg absolute top-4 right-4" onClick={onClose} aria-label="Close"><X size={14} /></button>
        <h3 className="display text-[18px] mb-3">{title}</h3>
        {children}
        {footer && <div className="mt-4 flex gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-veil p-6">
      <div className="bg-card rounded-[20px] p-5 w-full max-w-sm text-center animate-pop">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}>
          <AlertTriangle size={21} />
        </div>
        <h3 className="display text-[16px] mt-3">{title}</h3>
        <p className="tiny muted mt-2 leading-relaxed">{message}</p>
        <div className="flex gap-2 mt-4">
          <button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
          <button className="btn flex-1 text-white" style={{ background: 'var(--expense)' }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  const { toast } = useData();
  if (!toast) return null;
  return (
    <div key={toast.id} className="fixed bottom-24 left-1/2 z-[110] px-4 py-2.5 rounded-full text-[11px] font-semibold text-white shadow-xl max-w-[88vw] truncate animate-toast"
      style={{ background: 'var(--ink)' }}>
      {toast.msg}
    </div>
  );
}

export function Celebration() {
  const { celebration, clearCelebration, t } = useData();
  const [pieces, setPieces] = useState<{ left: number; delay: number; color: string; w: number }[]>([]);
  useEffect(() => {
    if (!celebration) return;
    const colors = ['#0d9b88', '#16a34a', '#f59e0b', '#ef5a5a', '#3b82f6', '#8b5cf6', '#c026d3'];
    setPieces(Array.from({ length: 44 }, (_, i) => ({
      left: Math.random() * 100, delay: Math.random() * 0.7,
      color: colors[i % colors.length], w: 5 + Math.random() * 6,
    })));
    const timer = window.setTimeout(clearCelebration, 4200);
    return () => window.clearTimeout(timer);
  }, [celebration?.id, clearCelebration]);
  if (!celebration) return null;
  const inc = celebration.type === 'income';
  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/40 p-6">
      {pieces.map((p, i) => (
        <span key={i} className="confetti" style={{ left: `${p.left}%`, background: p.color, width: p.w, height: p.w * 1.7, animationDelay: `${p.delay}s` }} />
      ))}
      <div className="bg-card rounded-[24px] p-6 text-center w-full max-w-xs relative animate-pop">
        <div className="text-5xl">{inc ? '🎉' : '✅'}</div>
        <h2 className="display text-[20px] mt-2">{inc ? t('congratulations') : 'Saved Successfully!'}</h2>
        <p className="tiny muted mt-2">{inc ? t('incomeSaved') : 'Entry saved on this device. Totals recalculated.'}</p>
        <div className="num text-[30px] mt-3" style={{ color: inc ? 'var(--income)' : 'var(--primary-dark)' }}>
          {inc ? '+' : '−'} {money(celebration.amount)}
        </div>
        <button className="btn-primary mt-5 w-full" onClick={clearCelebration}>Awesome</button>
      </div>
    </div>
  );
}

export function TxTypeBadge({ type }: { type: 'income' | 'expense' | 'transfer' }) {
  const cls = type === 'income' ? 'pill-income' : type === 'expense' ? 'pill-expense' : 'pill-transfer';
  const Icon = type === 'income' ? ArrowDownLeft : type === 'expense' ? ArrowUpRight : Briefcase;
  return <span className={`pill ${cls} inline-flex items-center gap-1`}><Icon size={11} />{type}</span>;
}

export function CheckMark({ ok }: { ok: boolean }) {
  return ok ? <Check size={16} /> : <PartyPopper size={16} />;
}
