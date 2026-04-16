import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedSupabaseUser,
  updateAuthenticatedUserMetadata,
} from '../../../../../lib/server-supabase';
import {
  removeStoredPushSubscription,
  sanitizeStoredPushSubscriptions,
} from '../../../../../lib/push-subscriptions';
import { sendPushNotifications } from '../../../../../lib/web-push';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedSupabaseUser(request);

    if (!authContext) {
      return NextResponse.json({ error: 'Sesion invalida o expirada.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const isTelegramTest = body.type === 'telegram';

    if (isTelegramTest) {
      const { sendTelegramMessage } = await import('../../../../../lib/telegram');
      const ok = await sendTelegramMessage({
        text: '✅ <b>¡Conexión Exitosa!</b>\n\nEste es un mensaje de prueba desde la configuración del consultorio. Ya estás listo para recibir los avisos.',
      });
      return NextResponse.json({ ok, telegram: true });
    }

    const currentMetadata = authContext.user.user_metadata || {};
    const currentSubscriptions = sanitizeStoredPushSubscriptions(currentMetadata.pushSubscriptions);
    const push = await sendPushNotifications(currentSubscriptions, {
      title: 'Alertas activadas',
      body: 'Este dispositivo ya esta listo para avisarle a la doctora cuando llegue un paciente.',
      tag: 'push-test',
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

    return NextResponse.json({
      ok: push.sentCount > 0,
      push,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo enviar la push de prueba.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
