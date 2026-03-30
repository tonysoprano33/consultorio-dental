type ReminderPatient = {
  name?: string | null;
  phone?: string | null;
};

type ReminderAppointment = {
  date: string;
  time: string;
  reason?: string | null;
  patient?: ReminderPatient | null;
};

export function buildReminderMessage(appointment: ReminderAppointment) {
  const patientName = appointment.patient?.name?.trim() || 'paciente';
  const reason = appointment.reason?.trim();
  const reasonLine = reason ? ` para ${reason}` : '';

  return [
    `Hola ${patientName}, te recordamos tu turno${reasonLine} en Consultorio Dental.`,
    `Fecha: ${formatHumanDate(appointment.date)}`,
    `Hora: ${appointment.time} hs`,
    'Si no vas a poder asistir, por favor avisanos con tiempo.',
    'Gracias.',
  ].join('\n');
}

export function formatHumanDate(dateString: string) {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

export function normalizeWhatsappPhone(rawPhone?: string | null) {
  if (!rawPhone) return '';

  let digits = rawPhone.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('549')) {
    return digits;
  }

  if (digits.startsWith('54')) {
    const localDigits = digits.slice(2).replace(/^0/, '');
    return localDigits.startsWith('9') ? `54${localDigits}` : `549${localDigits}`;
  }

  const normalizedLocal = digits.replace(/^0/, '');

  if (normalizedLocal.length >= 10) {
    return `549${normalizedLocal}`;
  }

  return '';
}

export function buildWhatsappUrl(rawPhone: string | null | undefined, message: string) {
  const phone = normalizeWhatsappPhone(rawPhone);

  if (!phone) return '';

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
