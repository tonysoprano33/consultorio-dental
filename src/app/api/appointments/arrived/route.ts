import { NextRequest, NextResponse } from 'next/server';
import { sendArrivalNotification, type SendArrivalNotificationResult } from '../../../../../lib/email';
import {
  getAuthenticatedSupabaseClient,
  getAuthenticatedSupabaseUser,
  updateAuthenticatedUserMetadata,
} from '../../../../../lib/server-supabase';
import {
  removeStoredPushSubscription,
  sanitizeStoredPushSubscriptions,
} from '../../../../../lib/push-subscriptions';
import {
  sendPushNotifications,
  type SendPushNotificationsResult,
} from '../../../../../lib/web-push';

type AppointmentRow = {
  id: string;
  date: string;
  time: string;
  reason?: string | null;
  notes?: string | null;
  status: 'pending' | 'arrived' | 'completed' | 'cancelled';
  patient?: {
    name?: string | null;
    phone?: string | null;
    os?: string | null;
  } | null;
};

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedSupabaseUser(request);
    const supabase = getAuthenticatedSupabaseClient(request);

    if (!authContext || !supabase) {
      return NextResponse.json({ error: 'Sesion invalida o expirada.' }, { status: 401 });
    }

    const body = await request.json();
    const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId : '';
    const notifyToEmail = typeof body.notifyToEmail === 'string' ? body.notifyToEmail : '';

    if (!appointmentId) {
      return NextResponse.json({ error: 'Falta appointmentId.' }, { status: 400 });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, date, time, reason, notes, status, patient:patients(name, phone, os)')
      .eq('id', appointmentId)
      .single<AppointmentRow>();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: appointmentError?.message || 'No se encontro el turno.' },
        { status: 404 }
      );
    }

    const newStatus = appointment.status === 'arrived' ? 'pending' : 'arrived';
    const arrivedAt = newStatus === 'arrived' ? new Date().toISOString() : null;

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: newStatus,
        arrived_at: arrivedAt,
      })
      .eq('id', appointmentId)
      .select('id, status, arrived_at')
      .single();

    if (updateError || !updatedAppointment) {
      return NextResponse.json(
        { error: updateError?.message || 'No se pudo actualizar el turno.' },
        { status: 500 }
      );
    }

    let email: SendArrivalNotificationResult = {
      sent: false,
      skipped: true,
      reason: 'No aplica para este cambio.',
    };

    let push: SendPushNotificationsResult = {
      configured: false,
      skipped: true,
      sentCount: 0,
      failedCount: 0,
      invalidEndpoints: [],
      reason: 'No aplica para este cambio.',
    };

    if (newStatus === 'arrived') {
      const patientName = appointment.patient?.name?.trim() || 'Paciente sin nombre';

      try {
        email = await sendArrivalNotification({
          toEmail: notifyToEmail,
          appointment: {
            date: appointment.date,
            time: appointment.time,
            reason: appointment.reason,
            patientName,
            patientPhone: appointment.patient?.phone,
            patientInsurance: appointment.patient?.os,
          },
        });
      } catch (error) {
        email = {
          sent: false,
          skipped: false,
          reason: error instanceof Error ? error.message : 'No se pudo enviar el email.',
        };
      }

      const currentMetadata = authContext.user.user_metadata || {};
      const currentSubscriptions = sanitizeStoredPushSubscriptions(currentMetadata.pushSubscriptions);

      push = await sendPushNotifications(currentSubscriptions, {
        title: 'Paciente en sala',
        body: `${patientName} llego y esta en la sala de espera${appointment.time ? ` - ${appointment.time}` : ''}.`,
        tag: `appointment-arrived-${appointment.id}`,
        url: '/',
      });

      if (push.invalidEndpoints.length > 0) {
        const cleanedSubscriptions = push.invalidEndpoints.reduce(
          (subscriptions, endpoint) => removeStoredPushSubscription(subscriptions, endpoint),
          currentSubscriptions
        );

        await updateAuthenticatedUserMetadata(authContext.accessToken, {
          ...currentMetadata,
          pushSubscriptions: cleanedSubscriptions,
        });
      }

      console.log('[PUSH DEBUG] currentSubscriptions length:', currentSubscriptions.length);
      console.log('[PUSH DEBUG] currentSubscriptions:', JSON.stringify(currentSubscriptions, null, 2));
      console.log('[PUSH DEBUG] push API result:', push);
    }

    // TELEGRAM INTEGRATION
    let telegramSent = false;
    if (newStatus === 'arrived') {
      try {
        const { sendTelegramMessage } = await import('../../../../lib/telegram');
        const patientData = appointment.patient as { name?: string; phone?: string; os?: string } | null;
        const patientName = (patientData?.name || 'Un paciente').trim();
        const timeInfo = appointment.time ? ` a las <b>${appointment.time}</b>` : '';
        const reasonInfo = appointment.reason ? `\n\n<b>Motivo:</b> ${appointment.reason}` : '';
        const notesInfo = appointment.notes ? `\n<b>Notas:</b> ${appointment.notes}` : '';
        const text = `🔔 <b>¡Paciente en sala!</b>\n\n${patientName} llegó${timeInfo} y te está esperando.${reasonInfo}${notesInfo}`;

        telegramSent = await sendTelegramMessage({
          chatId: '8303057631',
          text,
        });
        console.log('[TELEGRAM DEBUG] Envío exitoso:', telegramSent);
      } catch (err) {
        console.error('[TELEGRAM DEBUG] Error en integración:', err);
      }
    }

    return NextResponse.json({
      appointment: updatedAppointment,
      email,
      push,
      telegramSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
