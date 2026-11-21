import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS, initDatabase, uid, iso } from '../db';
import type { Account, AppSettings, BackupMeta, Budget, Category, Note, Recurring, Transaction } from '../types';
import { applyTheme, THEMES } from '../lib/themes';
import { fireNotification, processDueReminders, requestNotificationPermission } from '../lib/notifications';
import { translate, type Lang } from '../lib/i18n';
import { buildSnapshot, downloadText, parseBackup, readFileText, sealSnapshot, validateSnapshot, type BackupSnapshot } from '../lib/backup';
import { defaultMonth } from '../lib/finance';

export { DEFAULT_SETTINGS };

interface ToastState { id: number; msg: string; }
interface CeleState { id: number; amount: number; type: 'income' | 'expense'; }

interface DataContextValue {
  loading: boolean;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  notes: Note[];
  budgets: Budget[];
  recurring: Recurring[];
  backups: BackupMeta[];
  settings: AppSettings;
  month: string;
  setMonth: (m: string) => void;
  t: (key: string) => string;
  lang: Lang;
  toast: ToastState | null;
  celebration: CeleState | null;
  showToast: (msg: string) => void;
  clearCelebration: () => void;
  saveTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (id: string) => Promise<void>;
  saveAccount: (account: Partial<Account> & { name: string; type: string }) => Promise<void>;
  deleteAccount: (id: string) => Promise<boolean>;
  saveCategory: (category: Partial<Category> & { name: string; type: Category['type'] }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveBudget: (b: Partial<Budget> & { month: string; amount: number }) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  saveRecurring: (r: Partial<Recurring> & { amount: number; accountId: string }) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  saveNote: (n: Partial<Note> & { text: string }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  enableNotifications: () => Promise<boolean>;
  testNotification: () => Promise<void>;
  runReminderCheck: () => Promise<void>;
  exportData: (encrypted?: boolean, passphrase?: string) => Promise<void>;
  importData: (file: File, passphrase?: string) => Promise<boolean>;
  resetAll: () => Promise<void>;
  saveBackupMeta: (meta: BackupMeta) => Promise<void>;
  deleteBackupMeta: (id: string) => Promise<void>;
}

const Ctx = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(defaultMonth());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [celebration, setCelebration] = useState<CeleState | null>(null);
  const toastTimer = useRef<number | null>(null);
  const celeTimer = useRef<number | null>(null);
  const reminderLock = useRef(false);

  useEffect(() => {
    initDatabase().finally(() => setLoading(false));
  }, []);

  const accountsRaw = useLiveQuery(() => db.accounts.toArray(), [], [] as Account[]);
  const categoriesRaw = useLiveQuery(() => db.categories.toArray(), [], [] as Category[]);
  const transactionsRaw = useLiveQuery(() => db.transactions.toArray(), [], [] as Transaction[]);
  const notesRaw = useLiveQuery(() => db.notes.toArray(), [], [] as Note[]);
  const budgetsRaw = useLiveQuery(() => db.budgets.toArray(), [], [] as Budget[]);
  const recurringRaw = useLiveQuery(() => db.recurring.toArray(), [], [] as Recurring[]);
  const backupsRaw = useLiveQuery(() => db.backups.toArray(), [], [] as BackupMeta[]);
  const settingsRaw = useLiveQuery(() => db.settings.get('app'), [], undefined);

  const accounts = accountsRaw || [];
  const categories = categoriesRaw || [];
  const transactions = transactionsRaw || [];
  const notes = notesRaw || [];
  const budgets = budgetsRaw || [];
  const recurring = recurringRaw || [];
  const backups = backupsRaw || [];
  const settings: AppSettings = { ...DEFAULT_SETTINGS, ...(settingsRaw || {}) };
  const lang: Lang = settings.language === 'bn' ? 'bn' : 'en';
  const t = useCallback((key: string) => translate(lang, key), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    applyTheme(settings.theme, settings.themeMode);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = () => applyTheme(settings.theme, settings.themeMode);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [settings.theme, settings.themeMode]);

  const showToast = useCallback((msg: string) => {
    const id = Date.now();
    setToast({ id, msg });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const showCelebration = useCallback((amount: number, type: 'income' | 'expense') => {
    const id = Date.now();
    setCelebration({ id, amount, type });
    if (celeTimer.current) window.clearTimeout(celeTimer.current);
    celeTimer.current = window.setTimeout(() => setCelebration(null), 4200);
  }, []);

  const clearCelebration = useCallback(() => {
    if (celeTimer.current) window.clearTimeout(celeTimer.current);
    setCelebration(null);
  }, []);

  const dataRef = useRef({ transactions, notes, recurring });
  useEffect(() => { dataRef.current = { transactions, notes, recurring }; }, [transactions, notes, recurring]);

  const runReminderCheck = useCallback(async () => {
    if (reminderLock.current) return;
    reminderLock.current = true;
    try {
      const { transactions: txs, notes: ns, recurring: rec } = dataRef.current;
      const reminders = [
        ...txs.filter((x) => x.reminderDate && !x.notified).map((x) => ({
          id: 'tx-' + x.id, title: 'Payment reminder ⏰', body: x.note || `${x.categoryId} · ৳${x.amount}`, due: x.reminderDate!, notified: false,
        })),
        ...ns.filter((x) => x.reminderDate && !x.notified).map((x) => ({
          id: 'note-' + x.id, title: 'Note reminder 📝', body: x.text, due: x.reminderDate!, notified: false,
        })),
        ...rec.filter((x) => x.active && x.nextDate === iso(0)).map((x) => ({
          id: 'rec-' + x.id, title: 'Scheduled payment 🔁', body: `${x.note || x.categoryId} · ৳${x.amount}`, due: x.nextDate, notified: true,
        })),
      ];
      const fired = await processDueReminders(reminders);
      const txIds = fired.filter((id) => id.startsWith('tx-')).map((id) => id.slice(3));
      const noteIds = fired.filter((id) => id.startsWith('note-')).map((id) => id.slice(5));
      for (const id of txIds) await db.transactions.update(id, { notified: true });
      for (const id of noteIds) await db.notes.update(id, { notified: true });
    } finally {
      reminderLock.current = false;
    }
  }, []);

  useEffect(() => {
    if (loading || !settings.notificationsEnabled) return;
    const timer = window.setTimeout(() => { runReminderCheck(); }, 1200);
    const interval = window.setInterval(() => { runReminderCheck(); }, 60000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, [loading, settings.notificationsEnabled, runReminderCheck]);

  const saveTransaction = useCallback(async (tx: Transaction) => {
    await db.transactions.put(tx);
    if (tx.type === 'income') showCelebration(tx.amount, 'income');
    else showToast('Entry saved · totals updated');
  }, [showCelebration, showToast]);

  const deleteTransaction = useCallback(async (id: string) => {
    await db.transactions.delete(id);
    showToast('Entry deleted · totals updated');
  }, [showToast]);

  const duplicateTransaction = useCallback(async (id: string) => {
    const tx = await db.transactions.get(id);
    if (!tx) return;
    const now = Date.now();
    await db.transactions.add({ ...tx, id: uid(), date: iso(0), time: new Date().toTimeString().slice(0, 5), reminderDate: undefined, notified: false, createdAt: now, updatedAt: now });
    showToast('Entry duplicated');
  }, [showToast]);

  const saveAccount = useCallback(async (a: Partial<Account> & { name: string; type: string }) => {
    const existing = a.id ? await db.accounts.get(a.id) : undefined;
    const colors = ['#e9f0ff', '#e6f6ec', '#f3e8ff', '#fef3c7', '#e3f5f1', '#f1f5f9'];
    const icons: Record<string, string> = { Bank: '🏦', Savings: '🏦', bKash: '📱', Nagad: '📱', Rocket: '📱', Cash: '💵', Other: '📦' };
    const record: Account = {
      id: a.id || uid(),
      name: a.name.trim(),
      type: a.type,
      openingBalance: a.openingBalance ?? existing?.openingBalance ?? 0,
      color: a.color || existing?.color || colors[Math.floor(Math.random() * colors.length)],
      icon: a.icon || icons[a.type] || '📦',
      createdAt: existing?.createdAt || Date.now(),
    };
    await db.accounts.put(record);
    showToast(existing ? 'Account updated' : 'Account added');
  }, [showToast]);

  const deleteAccount = useCallback(async (id: string): Promise<boolean> => {
    const used = await db.transactions.where('accountId').equals(id).count();
    const transfers = (await db.transactions.toArray()).filter((x) => x.toAccountId === id).length;
    if (used + transfers > 0) {
      showToast('Cannot delete: account has transactions');
      return false;
    }
    await db.accounts.delete(id);
    showToast('Account deleted');
    return true;
  }, [showToast]);

  const saveCategory = useCallback(async (c: Partial<Category> & { name: string; type: Category['type'] }) => {
    const existing = c.id ? await db.categories.get(c.id) : undefined;
    const palette = ['#ef5a5a', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#0ea5e9', '#ec4899', '#84cc16', '#f97316', '#16a34a'];
    await db.categories.put({
      id: c.id || uid(), name: c.name.trim(), type: c.type,
      icon: c.icon || existing?.icon || 'CircleEllipsis',
      color: c.color || existing?.color || palette[Math.floor(Math.random() * palette.length)],
      parentId: c.parentId,
    });
    showToast('Category saved');
  }, [showToast]);

  const deleteCategory = useCallback(async (id: string) => {
    await db.categories.delete(id);
    showToast('Category deleted');
  }, [showToast]);

  const saveBudget = useCallback(async (b: Partial<Budget> & { month: string; amount: number }) => {
    await db.budgets.put({ id: b.id || uid(), month: b.month, categoryId: b.categoryId, amount: b.amount });
    showToast('Budget saved');
  }, [showToast]);

  const deleteBudget = useCallback(async (id: string) => {
    await db.budgets.delete(id);
    showToast('Budget removed');
  }, [showToast]);

  const saveRecurring = useCallback(async (r: Partial<Recurring> & { amount: number; accountId: string }) => {
    const existing = r.id ? await db.recurring.get(r.id) : undefined;
    await db.recurring.put({
      id: r.id || uid(), type: r.type || 'expense', amount: r.amount,
      categoryId: r.categoryId || '', accountId: r.accountId,
      paymentMethod: r.paymentMethod || 'Cash', note: r.note || '',
      frequency: r.frequency || 'monthly', startDate: r.startDate || iso(0),
      nextDate: r.nextDate || existing?.nextDate || iso(0), active: r.active ?? true,
    });
    showToast('Recurring schedule saved');
  }, [showToast]);

  const deleteRecurring = useCallback(async (id: string) => {
    await db.recurring.delete(id);
    showToast('Schedule removed');
  }, [showToast]);

  const saveNote = useCallback(async (n: Partial<Note> & { text: string }) => {
    const existing = n.id ? await db.notes.get(n.id) : undefined;
    await db.notes.put({
      id: n.id || uid(), date: n.date || iso(0), accountId: n.accountId,
      text: n.text, reminderDate: n.reminderDate, notified: n.notified ?? false,
      createdAt: existing?.createdAt || Date.now(),
    });
    showToast('Note saved');
  }, [showToast]);

  const deleteNote = useCallback(async (id: string) => {
    await db.notes.delete(id);
    showToast('Note deleted');
  }, [showToast]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    await db.settings.put({ ...DEFAULT_SETTINGS, ...settings, ...patch, key: 'app' });
  }, [settings]);

  const completeOnboarding = useCallback(async () => {
    await db.settings.put({ ...DEFAULT_SETTINGS, ...settings, onboardingDone: true, key: 'app' });
  }, [settings]);

  const enableNotifications = useCallback(async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      await updateSettings({ notificationsEnabled: true });
      showToast('Notifications enabled');
      return true;
    }
    await updateSettings({ notificationsEnabled: false });
    showToast('Notification permission denied');
    return false;
  }, [updateSettings, showToast]);

  const testNotification = useCallback(async () => {
    const ok = await fireNotification('Personal Finance Manager', 'Notifications are working. You will be reminded on due dates.', 'pfm-test');
    showToast(ok ? 'Test notification sent' : 'Allow notification permission first');
  }, [showToast]);

  const exportData = useCallback(async (encrypted = false, passphrase = '') => {
    const snapshot = await sealSnapshot(buildSnapshot({ accounts, categories, transactions, notes, budgets, recurring, settings: [settings], backups }));
    let text = JSON.stringify(snapshot, null, 2);
    if (encrypted) {
      const { encryptBackup } = await import('../lib/crypto');
      text = JSON.stringify(await encryptBackup(snapshot, passphrase), null, 2);
    }
    const stamp = iso(0);
    downloadText(`pfm-backup-${stamp}${encrypted ? '-encrypted' : ''}.json`, text);
    await db.settings.put({ ...settings, lastBackupAt: new Date().toISOString() });
    showToast(encrypted ? 'Encrypted backup downloaded' : 'JSON backup downloaded');
  }, [accounts, categories, transactions, notes, budgets, recurring, settings, backups, showToast]);

  const importData = useCallback(async (file: File, passphrase = ''): Promise<boolean> => {
    try {
      const text = await readFileText(file);
      const snap: BackupSnapshot = await parseBackup(text, passphrase);
      if (!validateSnapshot(snap)) throw new Error('Invalid backup');
      await db.transaction('rw', [db.accounts, db.categories, db.transactions, db.notes, db.budgets, db.recurring, db.settings, db.backups], async () => {
        await Promise.all([
          db.accounts.clear(), db.categories.clear(), db.transactions.clear(), db.notes.clear(),
          db.budgets.clear(), db.recurring.clear(), db.settings.clear(), db.backups.clear(),
        ]);
        if (snap.accounts.length) await db.accounts.bulkAdd(snap.accounts);
        if (snap.categories.length) await db.categories.bulkAdd(snap.categories);
        if (snap.transactions.length) await db.transactions.bulkAdd(snap.transactions);
        if (snap.notes?.length) await db.notes.bulkAdd(snap.notes);
        if (snap.budgets?.length) await db.budgets.bulkAdd(snap.budgets);
        if (snap.recurring?.length) await db.recurring.bulkAdd(snap.recurring);
        if (snap.settings?.length) await db.settings.bulkAdd(snap.settings);
        else await db.settings.add(DEFAULT_SETTINGS);
        if (snap.backups?.length) await db.backups.bulkAdd(snap.backups);
      });
      showToast('Backup imported successfully');
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Invalid backup file');
      return false;
    }
  }, [showToast]);

  const resetAll = useCallback(async () => {
    await db.transaction('rw', [db.accounts, db.categories, db.transactions, db.notes, db.budgets, db.recurring, db.settings, db.backups], async () => {
      await Promise.all([
        db.accounts.clear(), db.categories.clear(), db.transactions.clear(), db.notes.clear(),
        db.budgets.clear(), db.recurring.clear(), db.settings.clear(), db.backups.clear(),
      ]);
    });
    await db.settings.add(DEFAULT_SETTINGS);
    setMonth(defaultMonth());
    showToast('All data cleared — starting fresh');
  }, [showToast]);

  const saveBackupMeta = useCallback(async (meta: BackupMeta) => { await db.backups.put(meta); }, []);
  const deleteBackupMeta = useCallback(async (id: string) => { await db.backups.delete(id); }, []);

  const value = useMemo<DataContextValue>(() => ({
    loading, accounts, categories, transactions, notes, budgets, recurring, backups, settings,
    month, setMonth, t, lang, toast, celebration, showToast, clearCelebration,
    saveTransaction, deleteTransaction, duplicateTransaction,
    saveAccount, deleteAccount, saveCategory, deleteCategory, saveBudget, deleteBudget,
    saveRecurring, deleteRecurring, saveNote, deleteNote,
    updateSettings, completeOnboarding, enableNotifications, testNotification, runReminderCheck,
    exportData, importData, resetAll, saveBackupMeta, deleteBackupMeta,
  }), [
    loading, accounts, categories, transactions, notes, budgets, recurring, backups, settings,
    month, t, lang, toast, celebration, showToast, clearCelebration,
    saveTransaction, deleteTransaction, duplicateTransaction,
    saveAccount, deleteAccount, saveCategory, deleteCategory, saveBudget, deleteBudget,
    saveRecurring, deleteRecurring, saveNote, deleteNote,
    updateSettings, completeOnboarding, enableNotifications, testNotification, runReminderCheck,
    exportData, importData, resetAll, saveBackupMeta, deleteBackupMeta,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

export { THEMES };
