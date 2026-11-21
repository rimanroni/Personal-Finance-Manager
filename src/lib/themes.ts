import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export interface Theme {
  name: string;
  primary: string;
  dark: string;
  soft: string;
}

export const THEMES: Theme[] = [
  { name: 'Indigo Ink', primary: '#4f46e5', dark: '#3730a3', soft: '#eef2ff' },
  { name: 'Emerald', primary: '#10b981', dark: '#047857', soft: '#e3f7ee' },
  { name: 'Forest', primary: '#15803d', dark: '#166534', soft: '#e6f4ea' },
  { name: 'Ocean Blue', primary: '#0284c7', dark: '#0369a1', soft: '#e4f2fb' },
  { name: 'Indigo', primary: '#4f46e5', dark: '#3730a3', soft: '#ebeafe' },
  { name: 'Royal Purple', primary: '#7c3aed', dark: '#5b21b6', soft: '#f1eafe' },
  { name: 'Magenta', primary: '#c026d3', dark: '#86198f', soft: '#fae8ff' },
  { name: 'Rose', primary: '#e11d48', dark: '#9f1239', soft: '#ffe4e6' },
  { name: 'Crimson', primary: '#dc2626', dark: '#991b1b', soft: '#fee2e2' },
  { name: 'Coral', primary: '#f43f5e', dark: '#be123c', soft: '#ffe4e6' },
  { name: 'Amber', primary: '#d97706', dark: '#92400e', soft: '#fef3c7' },
  { name: 'Sunset', primary: '#ea580c', dark: '#9a3412', soft: '#ffedd5' },
  { name: 'Olive', primary: '#65a30d', dark: '#3f6212', soft: '#ecfccb' },
  { name: 'Slate', primary: '#475569', dark: '#1e293b', soft: '#f1f5f9' },
  { name: 'Midnight', primary: '#1e293b', dark: '#0f172a', soft: '#e2e8f0' },
  { name: 'Charcoal', primary: '#334155', dark: '#0f172a', soft: '#e2e8f0' },
  { name: 'Lavender', primary: '#8b5cf6', dark: '#6d28d9', soft: '#ede9fe' },
  { name: 'Sky', primary: '#0ea5e9', dark: '#0369a1', soft: '#e0f2fe' },
];

function rgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function applyTheme(index: number, mode: 'light' | 'dark' | 'system') {
  const t = THEMES[index] || THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-dark', t.dark);
  root.style.setProperty('--primary-soft', t.soft);
  // RGB channels let the ambient background and shadows follow every theme
  // without hard-coding 18 separate gradients.
  root.style.setProperty('--primary-rgb', rgb(t.primary));
  root.style.setProperty('--primary-dark-rgb', rgb(t.dark));
  root.style.setProperty('--soft-rgb', rgb(t.soft));
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const dark = mode === 'dark' || (mode === 'system' && prefersDark);
  root.classList.toggle('dark', dark);
  // The app shell is deep navy in both modes, so the browser status bar and
  // Android status-bar icons stay light regardless of the accent theme.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#080d19' : '#151d33');

  if (Capacitor.isNativePlatform()) {
    void SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => {});
  }
}
