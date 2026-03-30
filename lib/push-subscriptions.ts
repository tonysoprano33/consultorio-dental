export type StoredPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
  createdAt: string;
  updatedAt: string;
  deviceName?: string;
  userAgent?: string;
};

export type PushAlertPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
};

type SubscriptionInput = {
  endpoint?: unknown;
  expirationTime?: unknown;
  keys?: {
    auth?: unknown;
    p256dh?: unknown;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function sanitizeStoredPushSubscriptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as StoredPushSubscription[];
  }

  const normalized = value.map((item) => normalizePushSubscription(item));
  return normalized.filter((item): item is StoredPushSubscription => item !== null);
}

export function normalizePushSubscription(
  value: unknown,
  extras?: {
    deviceName?: string;
    userAgent?: string;
  }
): StoredPushSubscription | null {
  if (!isRecord(value)) {
    return null;
  }

  const subscription = value as SubscriptionInput;
  const endpoint = typeof subscription.endpoint === 'string' ? subscription.endpoint.trim() : '';
  const auth = typeof subscription.keys?.auth === 'string' ? subscription.keys.auth.trim() : '';
  const p256dh = typeof subscription.keys?.p256dh === 'string' ? subscription.keys.p256dh.trim() : '';

  if (!endpoint || !auth || !p256dh) {
    return null;
  }

  const now = new Date().toISOString();
  const createdAt = typeof value.createdAt === 'string' && value.createdAt ? value.createdAt : now;
  const updatedAt = now;
  const deviceName =
    typeof extras?.deviceName === 'string' && extras.deviceName.trim()
      ? extras.deviceName.trim()
      : typeof value.deviceName === 'string' && value.deviceName.trim()
        ? value.deviceName.trim()
        : undefined;
  const userAgent =
    typeof extras?.userAgent === 'string' && extras.userAgent.trim()
      ? extras.userAgent.trim()
      : typeof value.userAgent === 'string' && value.userAgent.trim()
        ? value.userAgent.trim()
        : undefined;

  return {
    endpoint,
    expirationTime: typeof subscription.expirationTime === 'number' ? subscription.expirationTime : null,
    keys: {
      auth,
      p256dh,
    },
    createdAt,
    updatedAt,
    deviceName,
    userAgent,
  };
}

export function mergeStoredPushSubscription(
  currentSubscriptions: StoredPushSubscription[],
  nextSubscription: StoredPushSubscription
) {
  const filtered = currentSubscriptions.filter(
    (subscription) => subscription.endpoint !== nextSubscription.endpoint
  );

  return [...filtered, nextSubscription];
}

export function removeStoredPushSubscription(
  currentSubscriptions: StoredPushSubscription[],
  endpoint: string
) {
  return currentSubscriptions.filter((subscription) => subscription.endpoint !== endpoint);
}
