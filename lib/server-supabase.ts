import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export type AuthenticatedSupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type AuthenticatedSupabaseContext = {
  accessToken: string;
  user: AuthenticatedSupabaseUser;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  return authHeader?.replace(/^Bearer\s+/i, '').trim() || null;
}

export function getAuthenticatedSupabaseClient(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) {
    return null;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function fetchAuthenticatedUser(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AuthenticatedSupabaseUser;
}

export async function getAuthenticatedSupabaseUser(request: NextRequest): Promise<AuthenticatedSupabaseContext | null> {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return null;
  }

  const user = await fetchAuthenticatedUser(accessToken);
  if (!user) {
    return null;
  }

  return {
    accessToken,
    user,
  };
}

export async function updateAuthenticatedUserMetadata(accessToken: string, metadata: Record<string, unknown>) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: metadata,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || 'No se pudo guardar la configuracion de notificaciones push.');
  }

  return (await response.json()) as AuthenticatedSupabaseUser;
}
