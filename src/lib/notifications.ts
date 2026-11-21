import { todayISO } from './format';
import { isNative, requestNotificationPermissionNative } from './permissions';

export interface ReminderInput {
  id: string;
  title: string;
  body: string;
  due: string;
  notified?: boolean;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  // Android requires POST_NOTIFICATIONS at runtime; the WebView's own
  // Notification permission is separate and is not enough on target SDK 36.
  if (isNative()) {
    const { granted } = await requestNotificationPermissionNative();
    return granted ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export async function fireNotification(title: string, body: string, tag?: string): Promise<boolean> {
  const options = {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: tag || 'pfm-reminder',
    renotify: true,
    data: { url: './' },
  } as NotificationOptions;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch (_) {
    /* fall through to Notification API */
  }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
      return true;
    }
  } catch (_) {
    /* some browsers disallow constructor on mobile */
  }
  return false;
}

/** Fires notifications for due/unnotified reminders and returns the ids that were shown. */
export async function processDueReminders(reminders: ReminderInput[]): Promise<string[]> {
  const today = todayISO();
  const due = reminders.filter((r) => !r.notified && r.due && r.due <= today);
  const fired: string[] = [];
  for (const r of due) {
    const ok = await fireNotification(r.title, r.body, r.id);
    if (ok) fired.push(r.id);
  }
  return fired;
}

export function reminderDaysLabel(due: string) {
  const diff = Math.round((new Date(due + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  return `in ${diff}d`;
}
