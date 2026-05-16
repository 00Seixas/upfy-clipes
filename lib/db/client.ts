import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Browser-side Supabase client singleton.
 * Uses the anon key only — for auth state and real-time subscriptions.
 * Respects RLS policies.
 */
export function getSupabaseBrowserClient(): ReturnType<typeof createBrowserClient<Database>> {
  if (_client) return _client

  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return _client
}
