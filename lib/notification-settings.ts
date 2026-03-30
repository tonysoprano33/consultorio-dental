export const NOTIFICATION_EMAIL_STORAGE_KEY = 'consultorio_email';

export function getStoredNotificationEmail() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NOTIFICATION_EMAIL_STORAGE_KEY)?.trim() || '';
}

export function setStoredNotificationEmail(email: string) {
  if (typeof window === 'undefined') return;

  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    localStorage.removeItem(NOTIFICATION_EMAIL_STORAGE_KEY);
    return;
  }

  localStorage.setItem(NOTIFICATION_EMAIL_STORAGE_KEY, normalizedEmail);
}
