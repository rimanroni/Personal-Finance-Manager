const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 150000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

export interface EncryptedEnvelope {
  format: 'pfm-backup';
  version: 1;
  encrypted: true;
  salt: string;
  iv: string;
  data: string;
}

export async function encryptBackup(payload: unknown, passphrase: string): Promise<EncryptedEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(JSON.stringify(payload)));
  return { format: 'pfm-backup', version: 1, encrypted: true, salt: toB64(salt.buffer), iv: toB64(iv.buffer), data: toB64(cipher) };
}

export async function decryptBackup(envelope: EncryptedEnvelope, passphrase: string): Promise<unknown> {
  const salt = fromB64(envelope.salt), iv = fromB64(envelope.iv), data = fromB64(envelope.data);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, data as BufferSource);
  return JSON.parse(dec.decode(plain));
}
