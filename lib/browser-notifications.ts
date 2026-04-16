export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.requestPermission();
}

export async function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
  } catch (error) {
    console.warn('Fallback a configuracion nativa', error);
  }

  try {
    new Notification(title, options);
    return true;
  } catch (error) {
    console.error('No se pudo mostrar la notificacion nativa.', error);
    return false;
  }
}
