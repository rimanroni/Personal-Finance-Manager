# Personal Finance Manager (PWA)

Private, offline, local-first personal finance app. No account, no backend, no tracking.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

The built app is in `dist/`. Serve it over HTTPS (or localhost) for service worker + notifications.

## Install on phone

- Open the deployed URL in Chrome/Edge → menu → **Install app / Add to Home screen**.
- Works offline after the first load.
- First open shows a 4-step welcome: name + optional photo, optional Google sign-in, reminders, then dashboard. This runs once; later changes are in **Settings**.

## Features

- Dashboard: total balance, money in/out, remaining, month selector, charts, recent transactions.
- Transactions: day-wise bKash/Nagad-style list, search, type/account filters, edit / delete / duplicate.
- Accounts: separate buckets for bKash, Nagad, Rocket, Bank, Cash, Savings, Other. The payment method is welded to the selected account so balances never mix.
- Reports: Recharts bar / donut / area charts.
- Budget, Calendar, Categories, Recurring schedules.
- Native-style notifications for due reminders (service worker `showNotification`, with fallback). Best when the app is open or installed.
- 18 themes, Light/Dark/System, English + বাংলা.
- Export/import JSON. Optional AES-256-GCM encrypted Google Drive backup (appDataFolder, token in memory only).
- Data lives in IndexedDB via Dexie. Nothing is auto-deleted.
- **Fresh install starts completely empty** — no demo accounts, categories or transactions. Add your own accounts/categories first; only your entries are stored. Reset also clears everything back to this empty state.

## Profile & Google sign-in

- **Settings → Profile**: change display name, upload/remove a profile photo. Stored locally as a compressed data URL; the header avatar and dashboard greeting update instantly.
- **Sign in with Google** opens Google's own account chooser popup directly. There is no in-app Client ID field, setup modal, or instruction screen. Cancelling the popup simply returns to the app; real errors show a short toast.
- Real OpenID Connect via Google Identity Services. Grants `openid email profile` + private `drive.appdata` access in one consent. Google name/email/photo are saved locally; the access token stays in memory only.
- The OAuth **Client ID** is public (it is not a client secret) and is loaded from deployment configuration — never hard-coded and never entered by users:
  - Build-time: `VITE_GOOGLE_CLIENT_ID` in `.env` (already configured for this install; see `.env.example`).
  - Runtime: `googleClientId` in `public/config.json`, or a backend/host-injected `window.__APP_CONFIG__`. Runtime config wins over build-time config.
  - **Never put a Client Secret in `.env`, `public/`, or any frontend file.** This app does not need one.
- Google Cloud one-time setup (admin/deployer): enable **Google Drive API**, create an OAuth client ID of type **Web application**, and add your deployed origin (and `http://localhost:5173` for local testing) to **Authorized JavaScript origins**.
- Tokens expire in about an hour; the app silently refreshes them during an explicit backup/restore and asks you to reconnect if authorization was revoked.

## Google Drive backup (optional)

1. Tap **Sign in with Google** in Settings or during onboarding — the standard Google account chooser opens directly.
2. Tap **Backup now** → choose a passphrase. The full snapshot (accounts, categories, transactions, notes, budgets, recurring, settings, backup metadata) is sealed with a SHA-256 checksum, then encrypted with AES-256-GCM **before** upload.
3. Backups are stored only in your own private Google Drive **appDataFolder**. Nothing is uploaded automatically.
4. **Refresh from Drive** lists that account's backups; **Restore** downloads, decrypts, validates structure + checksum, then replaces local data. Restore needs the original passphrase.
5. Settings shows the connected account, backup count, last backup time, status, **Disconnect**, and per-backup delete.
6. All Google logic is isolated in `src/lib/drive.ts` and `src/lib/googleConfig.ts`, so Android/WebView integration later does not require rewriting app pages.

## Developer

Roni Riman — tap the footer in Settings to chat on WhatsApp. No phone number is displayed in the UI.
