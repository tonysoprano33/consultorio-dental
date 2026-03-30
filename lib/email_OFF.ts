import nodemailer from 'nodemailer';
import { getArrivalEmailDraft, getTestEmailDraft } from './mail-drafts';

export type ArrivalEmailAppointment = {
  date: string;
  time: string;
  reason?: string | null;
  patientName: string;
  patientPhone?: string | null;
  patientInsurance?: string | null;
};

type SendArrivalNotificationInput = {
  appointment: ArrivalEmailAppointment;
  toEmail?: string | null;
};

type SendTestNotificationInput = {
  toEmail?: string | null;
};

export type SendArrivalNotificationResult = {
  sent: boolean;
  skipped: boolean;
  reason?: string;
};

type MailPayload = {
  toEmail?: string | null;
  subject: string;
  text: string;
  html: string;
};

function getDestinationEmail(toEmail?: string | null) {
  return toEmail?.trim() || process.env.NOTIFY_TO_EMAIL?.trim() || '';
}

function getFromEmail() {
  return (
    process.env.NOTIFY_FROM_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_USER ||
    'Consultorio Dental <onboarding@resend.dev>'
  );
}

function getSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const service = process.env.SMTP_SERVICE?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if ((!host && !service) || !user || !pass) {
    return null;
  }

  const secure = process.env.SMTP_SECURE === 'true';
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));

  return nodemailer.createTransport({
    host: host || undefined,
    service: service || undefined,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

async function sendWithSmtp(payload: MailPayload) {
  const transport = getSmtpTransport();

  if (!transport) {
    return {
      sent: false,
      skipped: true,
      reason: 'Falta configurar SMTP_HOST o SMTP_SERVICE junto con SMTP_USER y SMTP_PASS.',
    } satisfies SendArrivalNotificationResult;
  }

  const destinationEmail = getDestinationEmail(payload.toEmail);

  if (!destinationEmail) {
    return {
      sent: false,
      skipped: true,
      reason: 'No hay email de destino configurado.',
    } satisfies SendArrivalNotificationResult;
  }

  try {
    await transport.sendMail({
      from: getFromEmail(),
      to: destinationEmail,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    return {
      sent: true,
      skipped: false,
    } satisfies SendArrivalNotificationResult;
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      reason: error instanceof Error ? error.message : 'No se pudo enviar el email por SMTP.',
    } satisfies SendArrivalNotificationResult;
  }
}

async function sendWithResend(payload: MailPayload) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const destinationEmail = getDestinationEmail(payload.toEmail);

  if (!destinationEmail) {
    return {
      sent: false,
      skipped: true,
      reason: 'No hay email de destino configurado.',
    } satisfies SendArrivalNotificationResult;
  }

  if (!resendApiKey) {
    return {
      sent: false,
      skipped: true,
      reason: 'No hay SMTP configurado y falta RESEND_API_KEY como fallback.',
    } satisfies SendArrivalNotificationResult;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromEmail(),
      to: [destinationEmail],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    return {
      sent: false,
      skipped: false,
      reason: `Resend respondio ${response.status}: ${errorBody}`,
    } satisfies SendArrivalNotificationResult;
  }

  return {
    sent: true,
    skipped: false,
  } satisfies SendArrivalNotificationResult;
}

async function sendMail(payload: MailPayload) {
  const smtpResult = await sendWithSmtp(payload);

  if (smtpResult.sent || !smtpResult.skipped) {
    return smtpResult;
  }

  return sendWithResend(payload);
}

export async function sendArrivalNotification({
  appointment,
  toEmail,
}: SendArrivalNotificationInput): Promise<SendArrivalNotificationResult> {
  const draft = getArrivalEmailDraft(appointment);

  return sendMail({
    toEmail,
    subject: draft.subject,
    text: draft.text,
    html: `
      <div style="font-family: Arial, sans-serif; color: #18221c; line-height: 1.55;">
        <h2 style="margin-bottom: 8px;">Paciente en sala</h2>
        <p style="margin-top: 0;">${appointment.patientName} marco <strong>"Llego"</strong>.</p>
        <table style="border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Fecha</strong></td><td style="padding: 6px 0;">${appointment.date}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Hora</strong></td><td style="padding: 6px 0;">${appointment.time}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Motivo</strong></td><td style="padding: 6px 0;">${appointment.reason?.trim() || 'Consulta general'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Obra social</strong></td><td style="padding: 6px 0;">${appointment.patientInsurance?.trim() || 'Sin obra social'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Telefono</strong></td><td style="padding: 6px 0;">${appointment.patientPhone?.trim() || 'Sin telefono registrado'}</td></tr>
        </table>
      </div>
    `,
  });
}

export async function sendTestNotification({
  toEmail,
}: SendTestNotificationInput): Promise<SendArrivalNotificationResult> {
  const draft = getTestEmailDraft();

  return sendMail({
    toEmail,
    subject: draft.subject,
    text: draft.text,
    html: `
      <div style="font-family: Arial, sans-serif; color: #18221c; line-height: 1.55;">
        <h2 style="margin-bottom: 8px;">Prueba de correo</h2>
        <p>Este es un email de prueba del sistema del consultorio.</p>
        <p>Si recibiste este mensaje, el envio por correo esta funcionando correctamente.</p>
      </div>
    `,
  });
}
