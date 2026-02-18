// src/app/page.tsx
// NO 'use client' — this stays a Server Component

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/LandingPage'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // already logged in → skip landing page entirely
  if (user) redirect('/dashboard')

  return <LandingPage />
}