import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Dedicated client for browser — used for realtime + CRUD in client components
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}