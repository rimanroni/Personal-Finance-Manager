import Dexie, { type Table } from 'dexie';
import type { Account, AppSettings, BackupMeta, Budget, Category, Note, Recurring, Transaction } from './types';

export class FinanceDB extends Dexie {
  transactions!: Table<Transaction, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  recurring!: Table<Recurring, string>;
  notes!: Table<Note, string>;
  settings!: Table<AppSettings, string>;
  backups!: Table<BackupMeta, string>;

  constructor() {
    super('personal-finance-manager');
    this.version(1).stores({
      transactions: 'id, date, type, accountId, categoryId, createdAt, reminderDate',
      accounts: 'id, name, type',
      categories: 'id, name, type, parentId',
      budgets: 'id, month, categoryId',
      recurring: 'id, nextDate, frequency, active',
      notes: 'id, date, reminderDate',
      settings: 'key',
      backups: 'id, createdAt',
    });
  }
}

export const db = new FinanceDB();

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const iso = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const DEFAULT_SETTINGS: AppSettings = {
  key: 'app', currency: 'BDT', locale: 'en-US', language: 'en', themeMode: 'light', theme: 0,
  dateFormat: 'DD/MM/YYYY', notificationsEnabled: true,
  profileName: '', onboardingDone: false,
};

/** IDs used by the old hard-coded sample data. User-created rows use random UUIDs. */
const DEMO_IDS = {
  accounts: ['acc-bank', 'acc-bkash', 'acc-nagad', 'acc-rocket', 'acc-cash', 'acc-savings', 'acc-other'],
  categories: [
    'cat-e-food', 'cat-e-shopping', 'cat-e-transport', 'cat-e-bills', 'cat-e-medical', 'cat-e-education',
    'cat-e-entertainment', 'cat-e-family', 'cat-e-business', 'cat-e-other',
    'cat-i-salary', 'cat-i-business', 'cat-i-freelancing', 'cat-i-gift', 'cat-i-investment', 'cat-i-other',
  ],
  transactions: Array.from({ length: 18 }, (_, i) => `s${i + 1}`),
  notes: ['n1', 'n2', 'n3'],
  recurring: ['r1', 'r2'],
  budgets: ['b1', 'b2', 'b3'],
};

const CLEANUP_MARKER = 'demo-cleanup-v1';

/**
 * Fresh install: create only the settings row.
 * Older installs: remove the old hard-coded sample rows once, without touching user entries.
 * No demo accounts, categories, transactions, notes, budgets or schedules are seeded anymore.
 */
export async function initDatabase() {
  const marker = await db.settings.get(CLEANUP_MARKER);
  if (!marker) {
    await db.transaction('rw', [db.accounts, db.categories, db.transactions, db.notes, db.budgets, db.recurring, db.settings], async () => {
      const demoTx = new Set(DEMO_IDS.transactions);
      const [allTx, allNotes, allRecurring] = await Promise.all([
        db.transactions.toArray(), db.notes.toArray(), db.recurring.toArray(),
      ]);
      const userTx = allTx.filter((x) => !demoTx.has(x.id));
      const userNotes = allNotes.filter((x) => !DEMO_IDS.notes.includes(x.id));
      const userRecurring = allRecurring.filter((x) => !DEMO_IDS.recurring.includes(x.id));

      // Keep a demo account/category only when a user-created entry still points to it.
      // Clear its hard-coded opening balance so nothing fake survives.
      const keptAccounts = new Set<string>([
        ...userTx.map((x) => x.accountId),
        ...userNotes.map((x) => x.accountId).filter((id): id is string => Boolean(id)),
        ...userRecurring.map((x) => x.accountId),
      ]);
      const keptCategories = new Set<string>([
        ...userTx.map((x) => x.categoryId).filter((id): id is string => Boolean(id)),
        ...userRecurring.map((x) => x.categoryId).filter((id): id is string => Boolean(id)),
      ]);

      await Promise.all([
        ...DEMO_IDS.accounts.map((id) => keptAccounts.has(id)
          ? db.accounts.update(id, { openingBalance: 0 })
          : db.accounts.delete(id)),
        ...DEMO_IDS.categories.map((id) => keptCategories.has(id) ? Promise.resolve() : db.categories.delete(id)),
        db.transactions.where('id').anyOf(DEMO_IDS.transactions).delete(),
        db.notes.where('id').anyOf(DEMO_IDS.notes).delete(),
        db.budgets.where('id').anyOf(DEMO_IDS.budgets).delete(),
        db.recurring.where('id').anyOf(DEMO_IDS.recurring).delete(),
      ]);
      await db.settings.put({ key: CLEANUP_MARKER } as unknown as AppSettings);
    });
  }
  if (!(await db.settings.get('app'))) await db.settings.add(DEFAULT_SETTINGS);
}
