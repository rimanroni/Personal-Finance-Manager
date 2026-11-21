/** Tiny native-feeling tap feedback. No-op on devices/browsers without vibration. */
export function haptic(ms = 12) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}
