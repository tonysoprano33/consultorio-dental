import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedSupabaseUser,
  updateAuthenticatedUserMetadata,
} from '../../../../../lib/server-supabase';
import {
  mergeStoredPushSubscription,
  normalizePushSubscription,
  sanitizeStoredPushSubscriptions,
} from '../../../../../lib/push-subscriptions';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedSupabaseUser(request);

    if (!authContext) {
      return NextResponse.json({ error: 'Sesion invalida o expirada.' }, { status: 401 });
    }

    const body = await request.json();
    const subscription = normalizePushSubscription(body.subscription, {
      deviceName: typeof body.deviceName === 'string' ? body.deviceName : undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    if (!subscription) {
      return NextResponse.json({ error: 'La suscripcion push no es valida.' }, { status: 400 });
    }

    const currentMetadata = authContext.user.user_metadata || {};
    const currentSubscriptions = sanitizeStoredPushSubscriptions(currentMetadata.pushSubscriptions);
    const nextSubscriptions = mergeStoredPushSubscription(currentSubscriptions, subscription);

    await updateAuthenticatedUserMetadata(authContext.accessToken, {
      ...currentMetadata,
      pushSubscriptions: nextSubscriptions,
    });

    return NextResponse.json({
      ok: true,
      count: nextSubscriptions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar la suscripcion.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
