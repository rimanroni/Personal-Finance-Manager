import { Capacitor, registerPlugin } from '@capacitor/core';

export interface PermissionState {
  notification: 'granted' | 'denied' | 'prompt';
  photos: 'granted' | 'denied' | 'prompt';
  androidVersion: number;
}

interface AppPermissionsPlugin {
  status(): Promise<PermissionState>;
  requestNotification(): Promise<{ granted: boolean; permanentDenied: boolean }>;
  requestPhotos(): Promise<{ granted: boolean; permanentDenied: boolean }>;
  openSettings(): Promise<void>;
}

const bridge = registerPlugin<AppPermissionsPlugin>('AppPermissions');

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Reads the real Android permission state; on web the picker needs no runtime grant. */
export async function getPermissionState(): Promise<PermissionState> {
  if (!isNative()) {
    return {
      notification: typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'granted' : 'prompt',
      photos: 'granted',
      androidVersion: 0,
    };
  }
  try {
    return await bridge.status();
  } catch {
    return { notification: 'prompt', photos: 'prompt', androidVersion: 0 };
  }
}

/** Requests POST_NOTIFICATIONS on Android 13+; older versions are already granted. */
export async function requestNotificationPermissionNative(): Promise<{ granted: boolean; permanentDenied: boolean }> {
  if (!isNative()) {
    const perm = typeof Notification === 'undefined' ? 'denied' : Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    return { granted: perm === 'granted', permanentDenied: perm === 'denied' };
  }
  try {
    return await bridge.requestNotification();
  } catch {
    return { granted: false, permanentDenied: false };
  }
}

/** Requests gallery access (READ_MEDIA_IMAGES / legacy READ_EXTERNAL_STORAGE). */
export async function requestPhotoPermissionNative(): Promise<{ granted: boolean; permanentDenied: boolean }> {
  if (!isNative()) return { granted: true, permanentDenied: false };
  try {
    return await bridge.requestPhotos();
  } catch {
    return { granted: false, permanentDenied: false };
  }
}

export async function openAppPermissionSettings(): Promise<void> {
  if (!isNative()) return;
  try {
    await bridge.openSettings();
  } catch {
    /* No-op on web or if the OS refuses to open settings. */
  }
}

/** Called just before any image picker is opened. Safe to call on web. */
export async function ensurePhotoPermission(): Promise<boolean> {
  const state = await getPermissionState();
  if (state.photos === 'granted') return true;
  const result = await requestPhotoPermissionNative();
  return result.granted;
}
