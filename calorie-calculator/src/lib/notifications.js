/**
 * 30 Calz — Push Notification Utility
 * Local meal reminders via Notification API
 */

const STORAGE_KEY = '30calz_reminders';

export function getReminders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveReminders(reminders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export function addReminder(label, hour, minute) {
  const reminders = getReminders();
  reminders.push({ id: Date.now(), label, hour, minute, enabled: true });
  saveReminders(reminders);
  scheduleAll();
  return reminders;
}

export function removeReminder(id) {
  const reminders = getReminders().filter(r => r.id !== id);
  saveReminders(reminders);
  return reminders;
}

export function toggleReminder(id) {
  const reminders = getReminders().map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
  saveReminders(reminders);
  scheduleAll();
  return reminders;
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function showNotification(title, body, icon = '🍽️') {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/pwa-icon.svg',
      badge: '/pwa-icon.svg',
      tag: '30calz-reminder',
      renotify: true,
    });
  } catch {
    // Mobile may need service worker notifications
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/pwa-icon.svg',
          badge: '/pwa-icon.svg',
          tag: '30calz-reminder',
        });
      });
    }
  }
}

let scheduledTimers = [];

export function scheduleAll() {
  // Clear existing
  scheduledTimers.forEach(t => clearTimeout(t));
  scheduledTimers = [];

  if (Notification.permission !== 'granted') return;

  const reminders = getReminders().filter(r => r.enabled);
  const now = new Date();

  for (const r of reminders) {
    const target = new Date(now);
    target.setHours(r.hour, r.minute, 0, 0);

    // If time already passed today, schedule for tomorrow
    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target.getTime() - now.getTime();

    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        showNotification('30 Calz', `⏰ Time for ${r.label}! Don't forget to log your meal.`);
        // Re-schedule for next day
        setTimeout(() => scheduleAll(), 1000);
      }, delay);
      scheduledTimers.push(timer);
    }
  }
}

// Initialize on load
export function initNotifications() {
  if (Notification.permission === 'granted') {
    scheduleAll();
  }
}

// Default reminders
export const DEFAULT_REMINDERS = [
  { label: 'Breakfast', hour: 8, minute: 0 },
  { label: 'Lunch', hour: 13, minute: 0 },
  { label: 'Dinner', hour: 19, minute: 0 },
];
