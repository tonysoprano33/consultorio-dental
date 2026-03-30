// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

// Solo cliente para componentes del navegador (Client Components)
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}