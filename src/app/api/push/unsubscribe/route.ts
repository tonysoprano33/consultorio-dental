import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedSupabaseUser,
  updateAuthenticatedUserMetadata,
} from '../../../../../lib/server-supabase';
import {
  removeStoredPushSubscription,
  sanitizeStoredPushSubscriptions,
} from '../../../../../lib/push-subscriptions';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedSupabaseUser(request);

    if (!authContext) {
      return NextResponse.json({ error: 'Sesion invalida o expirada.' }, { status: 401 });
    }

    const body = await request.json();
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta el endpoint de la suscripcion.' }, { status: 400 });
    }

    const currentMetadata = authContext.user.user_metadata || {};
    const currentSubscriptions = sanitizeStoredPushSubscriptions(currentMetadata.pushSubscriptions);
    const nextSubscriptions = removeStoredPushSubscription(currentSubscriptions, endpoint);

    await updateAuthenticatedUserMetadata(authContext.accessToken, {
      ...currentMetadata,
      pushSubscriptions: nextSubscriptions,
    });

    return NextResponse.json({
      ok: true,
      count: nextSubscriptions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo desactivar la suscripcion.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
