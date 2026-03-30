import type { ArrivalEmailAppointment } from './email';

export function getArrivalEmailDraft(appointment: ArrivalEmailAppointment) {
  const reason = appointment.reason?.trim() || 'Consulta general';
  const insurance = appointment.patientInsurance?.trim() || 'Sin obra social';
  const phone = appointment.patientPhone?.trim() || 'Sin telefono registrado';

  return {
    subject: `Paciente en sala: ${appointment.patientName}`,
    text: [
      `El paciente ${appointment.patientName} marco "Llego".`,
      '',
      `Fecha: ${appointment.date}`,
      `Hora: ${appointment.time}`,
      `Motivo: ${reason}`,
      `Obra social: ${insurance}`,
      `Telefono: ${phone}`,
    ].join('\n'),
  };
}

export function getTestEmailDraft() {
  return {
    subject: 'Prueba de correo - Consultorio Dental',
    text: [
      'Este es un email de prueba del sistema del consultorio.',
      '',
      'Si recibiste este mensaje, el envio por correo esta funcionando correctamente.',
    ].join('\n'),
  };
}

export function buildMailtoUrl(toEmail: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
