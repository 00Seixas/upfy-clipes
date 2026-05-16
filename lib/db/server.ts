import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * User-scoped Supabase client.
 * Respects RLS — uses the anon key with the user's session cookie.
 * Safe to use in Server Components and Route Handlers.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // Read-only in Server Components; mutations handled by middleware
        set() {},
        remove() {},
      },
    }
  )
}

/**
 * Service-role Supabase client.
 * Bypasses RLS — NEVER expose to the browser.
 * For use in webhook handlers, cron jobs, and server-side admin operations only.
 */
export function createSupabaseServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Service client cannot be used in browser context')
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
