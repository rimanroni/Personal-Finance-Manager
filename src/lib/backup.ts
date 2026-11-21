import type { Account, AppSettings, BackupMeta, Budget, Category, Note, Recurring, Transaction } from '../types';

// Encryption helpers live in ./crypto and are imported lazily via dynamic
// import() below. Names are intentionally identical across all callers:
// encryptBackup(payload, passphrase) / decryptBackup(envelope, passphrase).

export interface BackupSnapshot {
  format: 'pfm-backup';
  version: 1;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  notes: Note[];
  budgets: Budget[];
  recurring: Recurring[];
  settings: AppSettings[];
  backups?: BackupMeta[];
  checksum?: string;
}

export interface BackupData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  notes: Note[];
  budgets: Budget[];
  recurring: Recurring[];
  settings: AppSettings[];
  backups: BackupMeta[];
}

export function buildSnapshot(data: BackupData): BackupSnapshot {
  return {
    format: 'pfm-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts: data.accounts,
    categories: data.categories,
    transactions: data.transactions,
    notes: data.notes,
    budgets: data.budgets,
    recurring: data.recurring,
    settings: data.settings,
    backups: data.backups,
  };
}

const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object';
const isArray = (x: unknown): x is unknown[] => Array.isArray(x);
const hasString = (x: unknown, key: string) => isObject(x) && typeof x[key] === 'string';
const hasNumber = (x: unknown, key: string) => isObject(x) && typeof x[key] === 'number' && Number.isFinite(x[key] as number);

/** Structural validation. AES-GCM / checksum provide integrity on top of this. */
export function validateSnapshot(x: unknown): x is BackupSnapshot {
  if (!isObject(x)) return false;
  if (x.format !== 'pfm-backup' || x.version !== 1) return false;
  if (!isArray(x.accounts) || !isArray(x.categories) || !isArray(x.transactions) || !isArray(x.notes)
    || !isArray(x.budgets) || !isArray(x.recurring) || !isArray(x.settings)) return false;
  if (x.backups !== undefined && !isArray(x.backups)) return false;
  if (x.checksum !== undefined && typeof x.checksum !== 'string') return false;

  const accountsOk = x.accounts.every((a) => hasString(a, 'id') && hasString(a, 'name') && hasString(a, 'type') && hasNumber(a, 'openingBalance'));
  const categoriesOk = x.categories.every((c) => hasString(c, 'id') && hasString(c, 'name') && hasString(c, 'type'));
  const transactionsOk = x.transactions.every((t) => hasString(t, 'id') && hasString(t, 'type') && hasString(t, 'date') && hasNumber(t, 'amount'));
  const notesOk = x.notes.every((n) => hasString(n, 'id') && hasString(n, 'text'));
  const budgetsOk = x.budgets.every((b) => hasString(b, 'id') && hasString(b, 'month') && hasNumber(b, 'amount'));
  const recurringOk = x.recurring.every((r) => hasString(r, 'id') && hasNumber(r, 'amount') && hasString(r, 'accountId'));
  const settingsOk = x.settings.every((s) => hasString(s, 'key') && typeof s === 'object');

  return accountsOk && categoriesOk && transactionsOk && notesOk && budgetsOk && recurringOk && settingsOk;
}

const encoder = new TextEncoder();

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Adds a tamper-evident hash before export/upload. Older backups without it still load. */
export async function sealSnapshot(snapshot: BackupSnapshot): Promise<BackupSnapshot> {
  const { checksum: _old, ...rest } = snapshot;
  return { ...rest, checksum: await sha256Hex(JSON.stringify(rest)) };
}

/** Verifies the checksum when present. Encrypted backups also fail on tamper via AES-GCM. */
export async function verifySnapshotIntegrity(snapshot: BackupSnapshot): Promise<void> {
  if (!snapshot.checksum) return;
  const { checksum, ...rest } = snapshot;
  const actual = await sha256Hex(JSON.stringify(rest));
  if (actual !== checksum) throw new Error('Backup integrity check failed — the file is damaged or altered');
}

export function downloadText(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function parseBackup(text: string, passphrase?: string): Promise<BackupSnapshot> {
  const parsed = JSON.parse(text);
  if (parsed?.encrypted && parsed?.format === 'pfm-backup') {
    const { decryptBackup } = await import('./crypto');
    const plain = await decryptBackup(parsed, passphrase || '');
    if (!validateSnapshot(plain)) throw new Error('Invalid decrypted backup');
    await verifySnapshotIntegrity(plain);
    return plain;
  }
  if (!validateSnapshot(parsed)) throw new Error('Invalid backup file');
  await verifySnapshotIntegrity(parsed);
  return parsed;
}
