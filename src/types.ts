export type TxType = 'expense' | 'income' | 'transfer';
export type CategoryType = 'expense' | 'income';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  accountId: string;
  toAccountId?: string;
  categoryId: string;
  paymentMethod: string;
  note: string;
  tags: string[];
  photo?: string; // data URL
  reminderDate?: string;
  notified?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Account {
  id: string;
  name: string;
  type: string; // Bank | bKash | Nagad | Rocket | Cash | Savings | Other
  openingBalance: number;
  color: string;
  icon: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  parentId?: string;
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  categoryId?: string; // undefined = overall monthly budget
  amount: number;
}

export interface Recurring {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  accountId: string;
  paymentMethod: string;
  note: string;
  frequency: Frequency;
  startDate: string;
  nextDate: string;
  active: boolean;
}

export interface Note {
  id: string;
  date: string;
  accountId?: string;
  text: string;
  reminderDate?: string;
  notified?: boolean;
  createdAt: number;
}

export interface AppSettings {
  key: 'app';
  currency: string;
  locale: string;
  language: 'en' | 'bn';
  themeMode: 'light' | 'dark' | 'system';
  theme: number;
  dateFormat: string;
  lastBackupAt?: string;
  notificationsEnabled: boolean;
  profileName: string;
  profilePhoto?: string;
  onboardingDone: boolean;
  googleName?: string;
  googleEmail?: string;
  googlePhoto?: string;
}

export interface BackupMeta {
  id: string;
  name: string;
  createdAt: string;
  encrypted: boolean;
  size: number;
  driveId?: string;
}
