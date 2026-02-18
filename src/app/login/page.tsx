'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const signIn = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  })
  return (
    <main className="min-h-screen bg-[#111417] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="text-4xl">🔖</div>
        <h1 className="font-mono text-2xl font-bold text-white">Stack Mark</h1>
        <p className="text-[#6b7a8d] font-mono text-sm">Your centralized bookmark manager</p>
        <button onClick={signIn}
          className="bg-[#00d4ff] text-black font-mono font-bold px-8 py-3 rounded w-full">
          Continue with Google
        </button>
      </div>
    </main>
  )
}