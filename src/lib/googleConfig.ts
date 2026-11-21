/**
 * Google OAuth configuration.
 *
 * The Client ID is a public identifier (not a secret), but it is supplied by the
 * deployment instead of being hard-coded or typed into the app UI.
 *
 * Priority:
 *   1. window.__APP_CONFIG__ (injected by a backend/host before the app loads)
 *   2. /config.json (runtime deployment config, no rebuild required)
 *   3. VITE_GOOGLE_CLIENT_ID (Vite build-time environment variable)
 */

type RuntimeConfig = {
  googleClientId?: string;
  GOOGLE_CLIENT_ID?: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

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
  return Boolean(await getGoogleClientId());
}
