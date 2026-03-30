import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '../../../../../lib/server-supabase';
import { sendTestNotification } from '../../../../../lib/email';

export async function POST(request: NextRequest) {
  try {
    const supabase = getAuthenticatedSupabaseClient(request);

    if (!supabase) {
      return NextResponse.json({ error: 'Sesion invalida o expirada.' }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No se pudo validar la sesion.' }, { status: 401 });
    }

    const body = await request.json();
    const toEmail = typeof body.toEmail === 'string' ? body.toEmail : '';

    const email = await sendTestNotification({ toEmail });

    if (!email.sent) {
      return NextResponse.json(
        { error: email.reason || 'No se pudo enviar el email de prueba.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
