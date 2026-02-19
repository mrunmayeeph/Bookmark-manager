import { createBrowserClient } from '@supabase/ssr'

// Dedicated client for browser — used for realtime + CRUD in client components
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}