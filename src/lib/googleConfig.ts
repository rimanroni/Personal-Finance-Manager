/**
 * Google OAuth configuration.
 *
 * Web/PWA: the Client ID is a public identifier (not a secret), supplied by
 * deployment config, never typed into the app UI.
 *
 * Android APK: NO web client ID and NO localhost origin are used. Google
 * Identity Services on Android binds the OAuth client to the app's package
 * name + SHA-1 fingerprint, so sign-in is fully native.
 *
 * Priority for web only:
 *   1. window.__APP_CONFIG__ (injected by a backend/host before the app loads)
 *   2. /config.json (runtime deployment config, no rebuild required)
 *   3. VITE_GOOGLE_CLIENT_ID (Vite build-time environment variable)
 */

import { Capacitor } from '@capacitor/core';

type RuntimeConfig = {
  googleClientId?: string;
  GOOGLE_CLIENT_ID?: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

/** True only for the installed Android app (native WebView). */
export const isNativeAndroid = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

let cachedConfig: RuntimeConfig | null = null;
let configPromise: Promise<RuntimeConfig> | null = null;

function loadConfigFile(): Promise<RuntimeConfig> {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (configPromise) return configPromise;
  configPromise = fetch(new URL('./config.json', document.baseURI).href, { cache: 'no-store' })
    .then((res) => res.ok ? res.json() : {})
    .catch(() => ({}))
    .then((cfg: RuntimeConfig) => {
      cachedConfig = cfg || {};
      return cachedConfig;
    });
  return configPromise;
}

export async function getGoogleClientId(): Promise<string> {
  // Android uses the native OAuth client (package name + SHA-1). A web client
  // ID here would trigger origin_mismatch, so it is intentionally ignored.
  if (isNativeAndroid()) return '';

  const fromEnv = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (typeof window === 'undefined') return fromEnv;

  const injected = window.__APP_CONFIG__;
  const fromGlobal = (injected?.googleClientId || injected?.GOOGLE_CLIENT_ID || '').trim();
  if (fromGlobal) return fromGlobal;

  const fileConfig = await loadConfigFile();
  const fromFile = (fileConfig.googleClientId || fileConfig.GOOGLE_CLIENT_ID || '').trim();
  return fromFile || fromEnv;
}

export async function isGoogleSignInConfigured(): Promise<boolean> {
  // Native Android needs no deployment configuration — only the Google Cloud
  // Android OAuth client with this app's package name + signing SHA-1.
  if (isNativeAndroid()) return true;
  return Boolean(await getGoogleClientId());
}
