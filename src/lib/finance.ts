import type { Account, Category, Transaction } from '../types';
import { shiftMonth, todayISO } from './format';

export interface AccountStat { balance: number; in: number; out: number; }

export function accountStats(accounts: Account[], transactions: Transaction[], month: string): Record<string, AccountStat> {
  const stats: Record<string, AccountStat> = {};
  accounts.forEach((a) => { stats[a.id] = { balance: a.openingBalance, in: 0, out: 0 }; });
  transactions.forEach((t) => {
    const acc = stats[t.accountId]; if (!acc) return;
    const inMonth = t.date.startsWith(month);
    if (t.type === 'income') { acc.balance += t.amount; if (inMonth) acc.in += t.amount; }
    else if (t.type === 'expense') { acc.balance -= t.amount; if (inMonth) acc.out += t.amount; }
    else if (t.type === 'transfer') { acc.balance -= t.amount; if (t.toAccountId && stats[t.toAccountId]) stats[t.toAccountId].balance += t.amount; }
  });
  return stats;
}

export function totals(accounts: Account[], transactions: Transaction[], month: string) {
  const stats = accountStats(accounts, transactions, month);
  const balance = Object.values(stats).reduce((s, x) => s + x.balance, 0);
  const income = Object.values(stats).reduce((s, x) => s + x.in, 0);
  const expense = Object.values(stats).reduce((s, x) => s + x.out, 0);
  return { stats, balance, income, expense, remaining: income - expense };
}

export function categoryTotals(transactions: Transaction[], month: string, type: 'expense' | 'income', categories: Category[]) {
  const map: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.type !== type || !t.date.startsWith(month)) return;
    map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
  });
  return Object.entries(map).map(([id, value]) => ({
    id, value, name: categories.find((c) => c.id === id)?.name || 'Other',
    color: categories.find((c) => c.id === id)?.color || '#64748b',
  })).sort((a, b) => b.value - a.value);
}

export function dailySeries(transactions: Transaction[], days = 7) {
  const out: { date: string; label: string; income: number; expense: number }[] = [];
  const base = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let income = 0, expense = 0;
    transactions.forEach((t) => { if (t.date === key) { if (t.type === 'income') income += t.amount; if (t.type === 'expense') expense += t.amount; } });
    out.push({ date: key, label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], income, expense });
  }
  return out;
}

export function monthlySeries(transactions: Transaction[], endMonth: string, months = 6) {
  const out: { key: string; label: string; income: number; expense: number; net: number }[] = [];
  let key = endMonth;
  for (let i = 0; i < months; i++) { out.unshift({ key, label: '', income: 0, expense: 0, net: 0 }); key = shiftMonth(key, -1); }
  out.forEach((m) => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    m.label = names[Number(m.key.slice(5)) - 1];
    transactions.forEach((t) => {
      if (!t.date.startsWith(m.key)) return;
      if (t.type === 'income') m.income += t.amount;
      if (t.type === 'expense') m.expense += t.amount;
    });
    m.net = m.income - m.expense;
  });
  return out;
}

export function groupByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  transactions.forEach((t) => { (groups[t.date] ||= []).push(t); });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

export function filterTransactions(transactions: Transaction[], opts: { month?: string; type?: string; accountId?: string; categoryId?: string; search?: string; from?: string; to?: string }) {
  return transactions.filter((t) => {
    if (opts.month && !t.date.startsWith(opts.month)) return false;
    if (opts.type && opts.type !== 'all' && t.type !== opts.type) return false;
    if (opts.accountId && t.accountId !== opts.accountId && t.toAccountId !== opts.accountId) return false;
    if (opts.categoryId && t.categoryId !== opts.categoryId) return false;
    if (opts.from && t.date < opts.from) return false;
    if (opts.to && t.date > opts.to) return false;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      if (!(`${t.note} ${t.paymentMethod} ${t.tags.join(' ')} ${t.amount}`.toLowerCase().includes(q))) return false;
    }
    return true;
  }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

export function budgetStatus(spent: number, amount: number) {
  const pct = amount ? (spent / amount) * 100 : 0;
  return { pct, status: pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok' };
}

export function nextRecurringDate(current: string, freq: string) {
  const d = new Date(current + 'T00:00:00');
  if (freq === 'daily') d.setDate(d.getDate() + 1);
  if (freq === 'weekly') d.setDate(d.getDate() + 7);
  if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const defaultMonth = () => todayISO().slice(0, 7);
