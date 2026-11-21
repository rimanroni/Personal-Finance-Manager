/**
 * Google sign-in (OpenID Connect) + optional Drive backup using appDataFolder.
 * The access token is kept in memory only — never written to storage.
 *
 * Android APK: sign-in is handled by the native GoogleAuth Capacitor plugin
 * (Google Identity Services, bound to package name + SHA-1). No web client ID,
 * no localhost origin and no client secret are involved.
 *
 * Web/PWA: Google Identity Services token client with a deployment-supplied
 * public Client ID. A client secret is never used or stored in the frontend.
 */

import { registerPlugin } from '@capacitor/core';
import { getGoogleClientId, isNativeAndroid } from './googleConfig';

type NativeAuthResult =
  | { status: 'success'; accessToken: string; expiresIn?: number; name?: string; email?: string; picture?: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

interface NativeGoogleAuthPlugin {
  signIn(options?: { selectAccount?: boolean }): Promise<NativeAuthResult>;
  disconnect(): Promise<void>;
}

const nativeGoogleAuth = registerPlugin<NativeGoogleAuthPlugin>('GoogleAuth');

export interface GoogleProfile {
  name: string;
  email: string;
  picture: string;
}

export type GoogleSignInResult =
  | { status: 'success'; profile: GoogleProfile }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export class GoogleAuthorizationError extends Error {
  constructor(message = 'Google authorization expired. Connect again.') {
    super(message);
    this.name = 'GoogleAuthorizationError';
  }
}

export const isGoogleAuthorizationError = (e: unknown): e is GoogleAuthorizationError => e instanceof GoogleAuthorizationError;

const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.appdata';
const API = 'https://www.googleapis.com/drive/v3';

let accessToken: string | null = null;
let tokenExpiresAt = 0;
let tokenClient: any = null;
let gisPromise: Promise<void> | null = null;

export const getAccessToken = () => accessToken;
export const isConnected = () => !!accessToken;

function clearSession() {
  accessToken = null;
  tokenExpiresAt = 0;
  tokenClient = null;
}

export function disconnect() {
  const token = accessToken;
  clearSession();
  if (isNativeAndroid()) {
    void nativeGoogleAuth.disconnect().catch(() => {});
    return;
  }
  try {
    if (token) (window as any).google?.accounts?.oauth2?.revoke?.(token, () => {});
  } catch (_) {
    /* noop */
  }
}

function loadGIS(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in. Check your internet connection.'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

type TokenResult =
  | { status: 'success'; token: string; profile?: GoogleProfile }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Android: ask the native plugin for a token via Google Identity Services. */
async function requestNativeToken(prompt: 'select_account' | ''): Promise<TokenResult> {
  try {
    const res = await nativeGoogleAuth.signIn({ selectAccount: prompt === 'select_account' });
    if (res.status === 'cancelled') return { status: 'cancelled' };
    if (res.status === 'error') return { status: 'error', message: res.message };

    accessToken = res.accessToken;
    const ttl = Math.max(60, Number(res.expiresIn) || 3600);
    tokenExpiresAt = Date.now() + (ttl - 60) * 1000;

    const profile: GoogleProfile | undefined = res.email || res.name
      ? { name: res.name || 'Google User', email: res.email || '', picture: res.picture || '' }
      : undefined;

    return { status: 'success', token: res.accessToken, profile };
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Google sign-in could not be completed. Please try again.',
    };
  }
}

function classifyGoogleError(err: unknown): { cancelled: true } | { cancelled: false; message: string } {
  const code = typeof err === 'string'
    ? err
    : (err as any)?.type || (err as any)?.error || (err as any)?.message || '';

  if (['popup_closed_by_user', 'user_closed_popup', 'access_denied', 'immediate_failed'].includes(code)) {
    return { cancelled: true };
  }

  const messages: Record<string, string> = {
    popup_failed_to_open: 'The Google popup was blocked. Allow popups for this site and try again.',
    invalid_client: 'Google sign-in is not configured correctly for this deployment.',
    redirect_uri_mismatch: 'This site is not authorized in the Google OAuth configuration.',
    origin_mismatch: 'This site is not authorized in the Google OAuth configuration.',
    network_error: 'A network error interrupted Google sign-in. Please try again.',
  };

  return { cancelled: false, message: messages[code] || 'Google sign-in could not be completed. Please try again.' };
}

async function requestGoogleToken(prompt: 'select_account' | ''): Promise<TokenResult> {
  // Installed APK: native Google Sign-In. Never use the web GIS flow here —
  // the Capacitor WebView origin cannot be a Google authorized JS origin.
  if (isNativeAndroid()) return requestNativeToken(prompt);

  const clientId = await getGoogleClientId();
  if (!clientId) return { status: 'error', message: 'Google sign-in is not configured for this deployment.' };

  try {
    await loadGIS();
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Could not load Google sign-in.' };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: TokenResult) => {
      if (!settled) { settled = true; resolve(result); }
    };

    try {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        ux_mode: 'popup',
        callback: (resp: any) => {
          if (resp?.error) {
            const mapped = classifyGoogleError(resp.error);
            finish(mapped.cancelled ? { status: 'cancelled' } : { status: 'error', message: mapped.message });
            return;
          }
          if (!resp?.access_token) {
            finish({ status: 'error', message: 'Google did not return an access token. Please try again.' });
            return;
          }
          const token: string = resp.access_token;
          accessToken = token;
          const ttl = Math.max(60, Number(resp.expires_in) || 3600);
          tokenExpiresAt = Date.now() + (ttl - 60) * 1000;
          finish({ status: 'success', token });
        },
        error_callback: (err: any) => {
          const mapped = classifyGoogleError(err);
          finish(mapped.cancelled ? { status: 'cancelled' } : { status: 'error', message: mapped.message });
        },
      });
      tokenClient.requestAccessToken({ prompt });
    } catch (e) {
      finish({ status: 'error', message: e instanceof Error ? e.message : 'Could not open the Google account chooser.' });
    }
  });
}

/** Reuses the token, or silently refreshes it when expired. Throws on revoked authorization. */
async function currentToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  if (!accessToken) throw new GoogleAuthorizationError('Connect Google first to use Drive.');

  const refreshed = await requestGoogleToken('');
  if (refreshed.status === 'success') return refreshed.token;

  clearSession();
  throw new GoogleAuthorizationError(
    refreshed.status === 'cancelled'
      ? 'Google authorization expired. Connect again.'
      : refreshed.message
  );
}

/** Fetches the signed-in Google account's basic profile. */
export async function getGoogleProfile(): Promise<GoogleProfile> {
  const token = await currentToken();
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearSession();
    throw new GoogleAuthorizationError();
  }
  if (!res.ok) throw new Error(`Could not read Google profile (${res.status})`);
  const j = await res.json();
  return { name: j.name || j.given_name || 'Google User', email: j.email || '', picture: j.picture || '' };
}

/**
 * Opens the standard Google account chooser in a popup and returns seamlessly.
 * Cancellation is reported as a normal result instead of an exception.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const token = await requestGoogleToken('select_account');
  if (token.status === 'cancelled') return { status: 'cancelled' };
  if (token.status === 'error') return { status: 'error', message: token.message };

  try {
    // Native Play services can return the profile directly; otherwise read it
    // from the userinfo endpoint with the access token (same as web/PWA).
    return { status: 'success', profile: token.profile || await getGoogleProfile() };
  } catch (e) {
    return {
      status: 'error',
      message: isGoogleAuthorizationError(e) ? e.message : e instanceof Error ? e.message : 'Signed in, but your Google profile could not be read.',
    };
  }
}

async function gapiFetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = await currentToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  if (res.status === 401) {
    clearSession();
    throw new GoogleAuthorizationError();
  }
  if (!res.ok) {
    let msg = `Drive error ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error?.message || msg;
    } catch (_) {
      /* noop */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
}

/** Lists backups in this user's private appDataFolder. Call only on an explicit user action. */
export async function listBackups(): Promise<DriveFile[]> {
  const q = encodeURIComponent("trashed = false and name contains 'pfm-backup'");
  const res = await gapiFetch(`/files?q=${q}&spaces=appDataFolder&fields=files(id,name,size,createdTime)&orderBy=createdTime%20desc&pageSize=50`);
  return res?.files || [];
}

export async function uploadBackup(name: string, content: string): Promise<DriveFile> {
  const boundary = 'pfm_backup_boundary';
  const metadata = { name, parents: ['appDataFolder'], mimeType: 'application/json' };
  const body = [
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
  return gapiFetch('/files?uploadType=multipart&fields=id,name,size,createdTime', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

export async function downloadBackup(id: string): Promise<string> {
  const token = await currentToken();
  const res = await fetch(`${API}/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    clearSession();
    throw new GoogleAuthorizationError();
  }
  if (!res.ok) throw new Error(`Drive error ${res.status}`);
  return res.text();
}

export async function deleteBackup(id: string): Promise<void> {
  await gapiFetch(`/files/${id}`, { method: 'DELETE' });
}
