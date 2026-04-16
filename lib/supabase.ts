// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

// Solo cliente para componentes del navegador (Client Components)
export const createClient = () => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  return createBrowserClient(url, anonKey)
}