import webpush from 'web-push';
import { PushAlertPayload, StoredPushSubscription } from './push-subscriptions';

type WebPushErrorLike = {
  statusCode?: number;
  body?: string;
  message?: string;
};

export type SendPushNotificationsResult = {
  configured: boolean;
  skipped: boolean;
  sentCount: number;
  failedCount: number;
  invalidEndpoints: string[];
  reason?: string;
};

let isConfigured = false;

function getWebPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:lautarovirtual@hotmail.com';

  return {
    publicKey,
    privateKey,
    subject,
  };
}

export function hasWebPushConfig() {
  const { publicKey, privateKey } = getWebPushConfig();
  return Boolean(publicKey && privateKey);
}

function ensureWebPushConfigured() {
  if (isConfigured) {
    return;
  }

  const { publicKey, privateKey, subject } = getWebPushConfig();

  if (!publicKey || !privateKey) {
    throw new Error('Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
}

function createPushPayload(payload: PushAlertPayload) {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || 'consultorio-alerta',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-96x96.png',
    requireInteraction: Boolean(payload.requireInteraction),
  });
}

export async function sendPushNotifications(
  subscriptions: StoredPushSubscription[],
  payload: PushAlertPayload
): Promise<SendPushNotificationsResult> {
  if (!subscriptions.length) {
    return {
      configured: hasWebPushConfig(),
      skipped: true,
      sentCount: 0,
      failedCount: 0,
      invalidEndpoints: [],
      reason: 'No hay dispositivos suscriptos.',
    };
  }

  if (!hasWebPushConfig()) {
    return {
      configured: false,
      skipped: true,
      sentCount: 0,
      failedCount: 0,
      invalidEndpoints: [],
      reason: 'Faltan las claves VAPID del servidor.',
    };
  }

  ensureWebPushConfigured();

  const serializedPayload = createPushPayload(payload);
  const invalidEndpoints: string[] = [];
  let sentCount = 0;
  let failedCount = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, serializedPayload);
        sentCount += 1;
      } catch (error) {
        failedCount += 1;
        const pushError = error as WebPushErrorLike;
        if (pushError.statusCode === 404 || pushError.statusCode === 410) {
          invalidEndpoints.push(subscription.endpoint);
        }
      }
    })
  );

  return {
    configured: true,
    skipped: false,
    sentCount,
    failedCount,
    invalidEndpoints,
    reason:
      sentCount > 0
        ? undefined
        : failedCount > 0
          ? 'No se pudo enviar la notificacion push a este dispositivo.'
          : 'No habia suscripciones disponibles.',
  };
}
