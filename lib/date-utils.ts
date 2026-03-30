export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDateInput(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function getTodayDateString() {
  return formatDateInput(new Date());
}

export function addDaysToDateString(dateString: string, days: number) {
  const date = parseDateInput(dateString);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

export function formatLongDate(dateString: string, locale = 'es-AR') {
  return parseDateInput(dateString).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
