'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────
type Bookmark = {
  id: number
  title: string
  url: string
  icon: string
  added: number
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60_000)   return 'just now'
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago'
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago'
  return Math.floor(diff / 86_400_000) + 'd ago'
}

const ICONS = ['🔗','📘','⚡','🛠','🎯','📌','💡','🌐','🎨','📦']
const SEED: Bookmark[] = [
  { id: 1, title: 'Next.js Docs',      url: 'https://nextjs.org/docs',       icon: '📘', added: Date.now() - 900_000 },
  { id: 2, title: 'Supabase Realtime', url: 'https://supabase.com/realtime', icon: '⚡', added: Date.now() - 600_000 },
  { id: 3, title: 'Tailwind CSS',      url: 'https://tailwindcss.com',       icon: '🎨', added: Date.now() - 300_000 },
]

// ── FAQ data ───────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Is Stack Mark free?',             a: 'Yes, completely free. Sign in with Google and start saving bookmarks immediately — no subscription, no credit card required.' },
  { q: 'Can other users see my bookmarks?', a: 'Never. Enforced by Supabase Row Level Security at the database level — not just hidden in the UI.' },
  { q: 'How does real-time sync work?',   a: 'Supabase Realtime uses postgres_changes over WebSocket. Add a bookmark in one tab and every other open tab updates instantly — no polling.' },
  { q: 'Why Google sign-in only?',        a: "Simplicity. No passwords to manage or forget — Google OAuth handles auth and you're signed in within seconds." },
  { q: 'What tech powers this?',          a: 'Next.js 14 (App Router), Supabase for auth, database and realtime, Tailwind CSS for styling, deployed on Vercel.' },
  { q: 'Do I need to install anything?',  a: 'Nothing at all. Open it in any browser, sign in with Google, and start saving links immediately.' },
]

// ══════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  // ── Demo state ───────────────────────────────────────────────────────────
  const [bookmarks, setBookmarks]   = useState<Bookmark[]>(SEED)
  const [nextId, setNextId]         = useState(4)
  const [query, setQuery]           = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [urlVal, setUrlVal]         = useState('')
  const [titleVal, setTitleVal]     = useState('')
  const [toast, setToast]           = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [newBadgeId, setNewBadgeId] = useState<number | null>(null)
  const [activeNav, setActiveNav]   = useState('all')
  const [openFaq, setOpenFaq]       = useState<number | null>(null)
  const [showBtt, setShowBtt]       = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // ── Back to top ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setShowBtt(window.scrollY > 400)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
      if (e.key === 'Enter' && modalOpen) saveBookmark()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [modalOpen, urlVal, titleVal])

  // ── Toast helper ─────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800)
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal() {
    setModalOpen(true)
    setTimeout(() => urlInputRef.current?.focus(), 150)
  }
  function closeModal() {
    setModalOpen(false)
    setUrlVal('')
    setTitleVal('')
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function saveBookmark() {
    if (!urlVal.trim() || !titleVal.trim()) { showToast('⚠ Please fill in both fields'); return }
    const bm: Bookmark = {
      id: nextId,
      title: titleVal.trim(),
      url: urlVal.trim(),
      icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      added: Date.now(),
    }
    setNextId(n => n + 1)
    setBookmarks(prev => [bm, ...prev])
    closeModal()
    setNewBadgeId(bm.id)
    setTimeout(() => setNewBadgeId(null), 2500)
    showToast('✓ Bookmark saved — synced live across all tabs!')
  }

  function deleteBookmark(id: number) {
    setTimeout(() => setBookmarks(prev => prev.filter(b => b.id !== id)), 220)
    showToast('🗑 Bookmark deleted')
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = bookmarks.filter(b =>
    b.title.toLowerCase().includes(query.toLowerCase()) ||
    b.url.toLowerCase().includes(query.toLowerCase())
  )

  const navLabels: Record<string, string> = { all: 'All Bookmarks', tech: 'Tech & Dev', design: 'Design' }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#111417] text-[#e2eaf2] font-mono overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-12 h-16 border-b border-[#1f2830] bg-[#111417]/95 backdrop-blur-md">
        <a href="#" className="flex items-center gap-3 no-underline">
          <span className="w-8 h-8 bg-[#00d4ff] rounded-md flex items-center justify-center text-black text-sm">🔖</span>
          <span className="font-bold text-lg text-[#e2eaf2]" style={{fontFamily:'Space Mono, monospace'}}>
            Stack <span className="text-[#00d4ff]">Mark</span>
          </span>
        </a>
        <ul className="hidden md:flex gap-8 list-none">
          {['about','how-it-works','demo','features','faq'].map(id => (
            <li key={id}>
              <a href={`#${id}`} className="text-[#6b7a8d] text-sm no-underline hover:text-[#00d4ff] transition-colors capitalize">
                {id === 'how-it-works' ? 'How It Works' : id === 'faq' ? 'FAQ' : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className="bg-[#00d4ff] text-black font-bold text-sm px-5 py-2 rounded no-underline hover:bg-[#00b8e0] hover:shadow-[0_0_16px_rgba(0,212,255,0.35)] transition-all"
          style={{fontFamily:'Space Mono, monospace'}}
        >
          Get Started
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center px-6 py-20">
        {/* grid bg */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#1f2830 1px,transparent 1px),linear-gradient(90deg,#1f2830 1px,transparent 1px)',
          backgroundSize: '48px 48px'
        }}/>
        {/* glow */}
        <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 60% 50% at 50% 40%,rgba(0,212,255,0.07) 0%,transparent 70%)'}}/>

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="font-bold text-5xl md:text-7xl leading-tight max-w-4xl" style={{fontFamily:'Space Mono, monospace'}}>
            Your Links,
            <span className="block text-[#00d4ff]" style={{textShadow:'0 0 40px rgba(0,212,255,0.4)'}}>
              Always Within Reach
            </span>
          </h1>

          <p className="mt-7 mb-11 text-[#6b7a8d] text-base leading-relaxed max-w-md">
            One place for every URL you care about. No browser clutter. No lost tabs.
            Just your bookmarks — private and real-time.
          </p>

          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/login"
              className="bg-[#00d4ff] text-black font-bold px-8 py-4 rounded no-underline hover:bg-[#00b8e0] hover:shadow-[0_0_24px_rgba(0,212,255,0.4)] transition-all"
              style={{fontFamily:'Space Mono, monospace'}}
            >
              Get Started &nbsp;›
            </Link>
            <a
              href="#demo"
              className="border border-[#263040] text-[#e2eaf2] font-bold px-8 py-4 rounded no-underline hover:border-[#00d4ff] hover:text-[#00d4ff] transition-all"
              style={{fontFamily:'Space Mono, monospace'}}
            >
              Try Live Demo
            </a>
          </div>

          <div className="mt-9 mb-5 border border-[#263040] rounded-full px-4 py-1 text-xs text-[#6b7a8d] tracking-widest uppercase">
            Next.js · Supabase · Tailwind · Vercel &nbsp;•
          </div>
          <div className="flex gap-7 text-sm text-[#6b7a8d]">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[#00d4ff] flex-shrink-0"/>Free forever</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[#00d4ff] flex-shrink-0"/>Sign in fast</span>
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="bg-[#161a1e] py-24 px-12">
        <h2 className="font-bold text-4xl text-center mb-3" style={{fontFamily:'Space Mono, monospace'}}>Your Digital Vault</h2>
        <p className="text-center text-[#6b7a8d] text-sm max-w-md mx-auto mb-14 leading-relaxed">Stop losing links. Start finding them instantly.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {/* Card 1 – Centralized */}
          <div className="bg-[#181c21] border border-[#1f2830] rounded-lg p-7 hover:border-[#00d4ff] hover:-translate-y-1 transition-all">
            <div className="h-40 bg-[#1c2026] border border-[#1f2830] rounded-md mb-6 overflow-hidden">
              <div className="grid grid-cols-3 gap-2 p-3 h-full">
                {['🔗','📄','🎬','💡','🛠','📌'].map((icon, i) => (
                  <div key={i} className="bg-[#111417] border border-[#263040] rounded p-2 flex flex-col gap-1">
                    <div className="w-4 h-4 bg-[#263040] rounded flex items-center justify-center text-[9px]">{icon}</div>
                    <div className="h-0.5 bg-[#263040] rounded w-full"/>
                    <div className="h-0.5 bg-[#263040] rounded w-1/2"/>
                  </div>
                ))}
              </div>
            </div>
            <h3 className="font-bold text-base mb-2" style={{fontFamily:'Space Mono, monospace'}}>
              <span className="text-[#00d4ff]">Centralized</span>
            </h3>
            <p className="text-[#6b7a8d] text-sm leading-relaxed">All your links in one organized vault. No more scattered tabs or forgotten browser bookmarks.</p>
          </div>

          {/* Card 2 – Private */}
          <div className="bg-[#181c21] border border-[#1f2830] rounded-lg p-7 hover:border-[#00d4ff] hover:-translate-y-1 transition-all">
            <div className="h-40 bg-[#1c2026] border border-[#1f2830] rounded-md mb-6 overflow-hidden p-3 flex flex-col gap-1.5">
              <div className="text-[0.55rem] text-[#404d5c] uppercase tracking-widest mb-1 px-1">Your Bookmarks</div>
              {[
                { label: 'All Bookmarks', color: '#00d4ff', active: true },
                { label: 'Tech & Dev',   color: '#3b82f6', active: false },
                { label: 'Design',       color: '#a78bfa', active: false },
                { label: 'Resources',    color: '#00e57a', active: false },
                { label: '🔒 Private',  color: '#1f2830', active: false, faded: true },
              ].map(({ label, color, active, faded }) => (
                <div key={label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[0.68rem] transition-colors ${active ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff]' : 'text-[#6b7a8d]'} ${faded ? 'opacity-30' : ''}`}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background: color}}/>
                  {label}
                </div>
              ))}
            </div>
            <h3 className="font-bold text-base mb-2" style={{fontFamily:'Space Mono, monospace'}}>
              <span className="text-[#00d4ff]">Private</span>
            </h3>
            <p className="text-[#6b7a8d] text-sm leading-relaxed">Enforced by Supabase Row Level Security. No one else can ever see your links — not even database admins.</p>
          </div>

          {/* Card 3 – Accessible */}
          <div className="bg-[#181c21] border border-[#1f2830] rounded-lg p-7 hover:border-[#00d4ff] hover:-translate-y-1 transition-all">
            <div className="h-40 bg-[#1c2026] border border-[#1f2830] rounded-md mb-6 overflow-hidden p-3 flex flex-col gap-2">
              <div className="bg-[#111417] border border-[#263040] rounded px-2.5 py-1.5 flex items-center justify-between text-[0.68rem] text-[#6b7a8d]">
                <span>🔍 &nbsp;Search bookmarks…</span>
                <span className="text-[0.55rem] bg-[#1f2830] px-1.5 py-0.5 rounded text-[#404d5c]">⌘K</span>
              </div>
              {[1,2].map(i => (
                <div key={i} className={`bg-[#111417] border border-[#263040] rounded px-2.5 py-1.5 flex items-center gap-2 ${i===2?'opacity-40':''}`}>
                  <div className="w-3.5 h-3.5 bg-[#1f2830] rounded flex-shrink-0"/>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="h-0.5 bg-[#263040] rounded w-full"/>
                    <div className="h-0.5 bg-[#263040] rounded w-1/2"/>
                  </div>
                </div>
              ))}
            </div>
            <h3 className="font-bold text-base mb-2" style={{fontFamily:'Space Mono, monospace'}}>
              <span className="text-[#00d4ff]">Accessible</span>
            </h3>
            <p className="text-[#6b7a8d] text-sm leading-relaxed">Instant access from a clean dashboard. Every bookmark is one click away, anytime.</p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-[#111417] py-24 px-12">
        <h2 className="font-bold text-4xl text-center mb-3" style={{fontFamily:'Space Mono, monospace'}}>How It Works</h2>
        <p className="text-center text-[#6b7a8d] text-sm max-w-md mx-auto mb-14 leading-relaxed">Four steps. That's all it takes to stay organised.</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="bg-[#181c21] border border-[#1f2830] rounded-lg p-5 hover:border-[#404d5c] transition-colors">
            <div className="h-32 bg-[#1c2026] border border-[#1f2830] rounded-md mb-4 flex flex-col justify-center p-3 gap-1.5 overflow-hidden">
              <div className="bg-[#111417] border border-[#263040] rounded px-2 py-1.5 flex items-center gap-1.5">
                <span className="text-[#6b7a8d] text-[10px]">G</span>
                <span className="text-[0.6rem] text-[#6b7a8d] flex-1">accounts.google.com</span>
              </div>
              <div className="bg-[#111417] border border-[#263040] rounded px-2 py-1.5 flex items-center gap-1.5">
                <span className="text-[#00d4ff] text-[10px]">✓</span>
                <span className="text-[0.6rem] text-[#e2eaf2] flex-1 truncate">Signed in as user@gmail.com</span>
              </div>
              <div className="text-[0.6rem] text-[#00d4ff] pl-0.5">✓ Redirecting to dashboard…</div>
            </div>
            <div className="text-[0.78rem] text-[#00d4ff] mb-1" style={{fontFamily:'Space Mono, monospace'}}>01</div>
            <h3 className="font-bold text-sm mb-1" style={{fontFamily:'Space Mono, monospace'}}>Sign In</h3>
            <p className="text-[#6b7a8d] text-xs leading-relaxed">One click with Google. No passwords, no forms — instant access.</p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#181c21] border border-[#1f2830] rounded-lg p-5 hover:border-[#404d5c] transition-colors">
            <div className="h-32 bg-[#1c2026] border border-[#1f2830] rounded-md mb-4 flex flex-col justify-center p-3 gap-1.5 overflow-hidden">
              <div className="bg-[#111417] border border-[#263040] rounded px-2 py-1.5 flex items-center gap-1.5">
                <span className="text-[10px]">🔗</span>
                <span className="text-[0.6rem] text-[#e2eaf2] flex-1 truncate">https://github.com/…</span>
              </div>
              <div className="bg-[#111417] border border-[#263040] rounded px-2 py-1.5 flex items-center gap-1.5">
                <span className="text-[#6b7a8d] text-[10px]">T</span>
                <span className="text-[0.6rem] text-[#e2eaf2] flex-1 truncate">Awesome React Repo</span>
              </div>
              <div className="bg-[#00d4ff] text-black text-[0.6rem] font-bold px-2 py-1.5 rounded text-center" style={{fontFamily:'Space Mono, monospace'}}>
                + Save Bookmark
              </div>
            </div>
            <div className="text-[0.78rem] text-[#00d4ff] mb-1" style={{fontFamily:'Space Mono, monospace'}}>02</div>
            <h3 className="font-bold text-sm mb-1" style={{fontFamily:'Space Mono, monospace'}}>Save</h3>
            <p className="text-[#6b7a8d] text-xs leading-relaxed">Paste a URL and give it a title. Saved instantly to your private vault.</p>
          </div>

          {/* Step 3 */}
          <div className="bg-[#181c21] border border-[#1f2830] rounded-lg p-5 hover:border-[#404d5c] transition-colors">
            <div className="h-32 bg-[#1c2026] border border-[#1f2830] rounded-md mb-4 flex flex-col justify-center p-3 gap-1.5 overflow-hidden">
              <div className="flex gap-1.5">
                {['Tab 1','Tab 2'].map(t => (
                  <div key={t} className="flex-1 border border-[#00d4ff] text-[#00d4ff] text-[0.55rem] text-center py-1 rounded bg-[#111417]">{t}</div>
                ))}
              </div>
              {[{delay:'',label:'New bookmark appeared live'},{delay:'0.7s',label:'No refresh needed',faded:true}].map(({delay,label,faded},i) => (
                <div key={i} className={`bg-[#111417] border border-[#263040] rounded px-2 py-1.5 flex items-center gap-1.5 ${faded?'opacity-40':''}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e57a] flex-shrink-0 animate-pulse" style={{animationDelay:delay}}/>
                  <span className="text-[0.6rem] text-[#6b7a8d] flex-1">{label}</span>
                </div>
              ))}
            </div>
            <div className="text-[0.78rem] text-[#00d4ff] mb-1" style={{fontFamily:'Space Mono, monospace'}}>03</div>
            <h3 className="font-bold text-sm mb-1" style={{fontFamily:'Space Mono, monospace'}}>Sync</h3>
            <p className="text-[#6b7a8d] text-xs leading-relaxed">Open two tabs — add a bookmark in one and it appears in the other instantly.</p>
          </div>

          {/* Step 4 */}
          <div className="bg-[#181c21] border border-[#1f2830] rounded-lg p-5 hover:border-[#404d5c] transition-colors">
            <div className="h-32 bg-[#1c2026] border border-[#1f2830] rounded-md mb-4 flex flex-col justify-center p-3 gap-1.5 overflow-hidden">
              {['github.com/awesome-repo','docs.supabase.com/…'].map((url, i) => (
                <div key={url} className={`bg-[#111417] border border-[#263040] rounded px-2 py-1.5 flex items-center gap-1.5 ${i===1?'opacity-40':''}`}>
                  <span className="text-[10px]">🗑</span>
                  <span className="text-[0.6rem] text-[#6b7a8d] flex-1 truncate">{url}</span>
                  <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-[rgba(255,77,106,0.12)] text-[#ff4d6a]">Delete</span>
                </div>
              ))}
              <div className="text-[0.6rem] text-[#ff4d6a] pl-0.5">Only you can delete your bookmarks.</div>
            </div>
            <div className="text-[0.78rem] text-[#00d4ff] mb-1" style={{fontFamily:'Space Mono, monospace'}}>04</div>
            <h3 className="font-bold text-sm mb-1" style={{fontFamily:'Space Mono, monospace'}}>Delete</h3>
            <p className="text-[#6b7a8d] text-xs leading-relaxed">Remove any bookmark in one click. Only you have access to your own data.</p>
          </div>
        </div>
      </section>

      {/* ── LIVE INTERACTIVE DEMO ── */}
      <section id="demo" className="bg-[#161a1e] py-24 px-6 md:px-12">
        <h2 className="font-bold text-4xl text-center mb-3" style={{fontFamily:'Space Mono, monospace'}}>Try It Live</h2>
        <p className="text-center text-[#6b7a8d] text-sm max-w-md mx-auto mb-12 leading-relaxed">
          Add and delete bookmarks below. This is exactly how the real dashboard works.
        </p>

        <div className="max-w-4xl mx-auto bg-[#13171b] border border-[#263040] rounded-xl overflow-hidden relative">

          {/* browser chrome */}
          <div className="bg-[#1c2026] border-b border-[#1f2830] px-4 py-2.5 flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]"/>
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"/>
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]"/>
            </div>
            <div className="flex-1 bg-[#111417] border border-[#1f2830] rounded px-3 py-1 text-[0.7rem] text-[#6b7a8d]">
              🔖 &nbsp;stackmark.app/dashboard
            </div>
          </div>

          <div className="flex h-[460px]">
            {/* sidebar */}
            <div className="w-48 border-r border-[#1f2830] p-3 flex-shrink-0 hidden md:flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-5 h-5 bg-[#00d4ff] rounded flex items-center justify-center text-black text-xs">🔖</div>
                <span className="font-bold text-xs text-[#e2eaf2]" style={{fontFamily:'Space Mono, monospace'}}>Stack Mark</span>
              </div>
              {[
                { id:'all',    label:'📑 All Bookmarks' },
                { id:'tech',   label:'⚙️ Tech & Dev'   },
                { id:'design', label:'🎨 Design'        },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveNav(id)}
                  className={`text-left px-2.5 py-1.5 rounded text-[0.72rem] transition-all cursor-pointer border-none ${activeNav === id ? 'bg-[rgba(0,212,255,0.08)] text-[#00d4ff]' : 'text-[#6b7a8d] hover:bg-[rgba(0,212,255,0.05)] hover:text-[#00d4ff]'}`}
                >
                  {label}
                </button>
              ))}
              <div className="mt-auto border-t border-[#1f2830] pt-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-6 h-6 rounded-full bg-[#00d4ff] flex items-center justify-center text-black text-xs font-bold flex-shrink-0">U</div>
                  <span className="text-[0.65rem] text-[#6b7a8d] truncate">you@gmail.com</span>
                </div>
              </div>
            </div>

            {/* main */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* topbar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f2830]">
                <div className="flex items-center gap-1.5 text-[0.75rem] text-[#6b7a8d]">
                  <span>📑</span>
                  <span className="text-[#263040]">/</span>
                  <span className="text-[#e2eaf2]">{navLabels[activeNav]}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="🔍  Search…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="bg-[#1c2026] border border-[#263040] rounded px-2.5 py-1.5 text-[0.7rem] text-[#e2eaf2] w-36 outline-none focus:border-[#00d4ff] placeholder-[#404d5c] transition-colors"
                  />
                  <button
                    onClick={openModal}
                    className="bg-[#00d4ff] text-black font-bold text-[0.7rem] px-3 py-1.5 rounded cursor-pointer border-none hover:bg-[#00b8e0] hover:shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all whitespace-nowrap"
                    style={{fontFamily:'Space Mono, monospace'}}
                  >
                    + Add Bookmark
                  </button>
                </div>
              </div>

              {/* content */}
              <div className="flex-1 p-5 overflow-y-auto">
                <div className="mb-4">
                  <h3 className="font-bold text-sm" style={{fontFamily:'Space Mono, monospace'}}>{navLabels[activeNav]}</h3>
                  <div className="text-[0.72rem] text-[#6b7a8d] mt-1">{filtered.length} bookmark{filtered.length !== 1 ? 's' : ''}</div>
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-10 text-[#6b7a8d] text-sm">
                    No bookmarks yet. Hit <strong className="text-[#00d4ff]">+ Add Bookmark</strong> to save your first link.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filtered.map(bm => (
                      <div
                        key={bm.id}
                        className="bg-[#1c2026] border border-[#1f2830] rounded-md overflow-hidden hover:border-[#00d4ff] hover:-translate-y-0.5 transition-all relative"
                      >
                        {/* live badge */}
                        {newBadgeId === bm.id && (
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-[rgba(0,229,122,0.12)] text-[#00e57a] text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{fontFamily:'Space Mono, monospace'}}>
                            <span className="w-1 h-1 rounded-full bg-[#00e57a] animate-pulse"/>
                            Live
                          </div>
                        )}
                        <div className="h-16 flex items-center justify-center text-2xl border-b border-[#1f2830] bg-gradient-to-br from-[#1c2026] to-[#111417]">
                          {bm.icon}
                        </div>
                        <div className="p-2.5">
                          <div className="font-bold text-[0.68rem] text-[#e2eaf2] truncate mb-0.5" style={{fontFamily:'Space Mono, monospace'}}>{bm.title}</div>
                          <div className="text-[0.6rem] text-[#6b7a8d] truncate mb-2">{getDomain(bm.url)}</div>
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[0.58rem] text-[#404d5c] mr-auto">{timeAgo(bm.added)}</span>
                            <button
                              onClick={() => showToast(`↗ Opening ${getDomain(bm.url)}…`)}
                              className="bg-none border-none cursor-pointer text-[11px] text-[#404d5c] px-1 py-0.5 rounded hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
                            >↗</button>
                            <button
                              onClick={() => deleteBookmark(bm.id)}
                              className="bg-none border-none cursor-pointer text-[11px] text-[#404d5c] px-1 py-0.5 rounded hover:text-[#ff4d6a] hover:bg-[rgba(255,77,106,0.1)] transition-all"
                            >🗑</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add Bookmark Modal */}
          {modalOpen && (
            <div
              className="absolute inset-0 bg-black/70 flex items-center justify-center z-10"
              onClick={e => { if (e.target === e.currentTarget) closeModal() }}
            >
              <div className="bg-[#181c21] border border-[#263040] rounded-xl p-7 w-80">
                <h4 className="font-bold text-sm mb-4" style={{fontFamily:'Space Mono, monospace'}}>
                  Add <span className="text-[#00d4ff]">Bookmark</span>
                </h4>
                <div className="mb-3.5">
                  <label className="text-[0.72rem] text-[#6b7a8d] mb-1.5 block">URL</label>
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={urlVal}
                    onChange={e => setUrlVal(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-[#1c2026] border border-[#263040] rounded px-2.5 py-2 text-[#e2eaf2] text-sm outline-none focus:border-[#00d4ff] placeholder-[#404d5c] transition-colors"
                  />
                </div>
                <div className="mb-3.5">
                  <label className="text-[0.72rem] text-[#6b7a8d] mb-1.5 block">Title</label>
                  <input
                    type="text"
                    value={titleVal}
                    onChange={e => setTitleVal(e.target.value)}
                    placeholder="My awesome link"
                    className="w-full bg-[#1c2026] border border-[#263040] rounded px-2.5 py-2 text-[#e2eaf2] text-sm outline-none focus:border-[#00d4ff] placeholder-[#404d5c] transition-colors"
                  />
                </div>
                <div className="flex gap-2.5 mt-4">
                  <button
                    onClick={saveBookmark}
                    className="flex-1 bg-[#00d4ff] text-black font-bold text-sm py-2.5 rounded border-none cursor-pointer hover:bg-[#00b8e0] transition-colors"
                    style={{fontFamily:'Space Mono, monospace'}}
                  >
                    Save Bookmark
                  </button>
                  <button
                    onClick={closeModal}
                    className="bg-transparent text-[#6b7a8d] border border-[#263040] text-sm px-3.5 py-2.5 rounded cursor-pointer hover:border-[#ff4d6a] hover:text-[#ff4d6a] transition-all"
                    style={{fontFamily:'Space Mono, monospace'}}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast */}
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1c2026] border border-[#00d4ff] rounded-md px-4 py-2 text-[0.72rem] text-[#00d4ff] whitespace-nowrap z-20 transition-all duration-300 ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`} style={{fontFamily:'Space Mono, monospace'}}>
            {toast}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-[#111417] py-24 px-12">
        <h2 className="font-bold text-4xl text-center mb-3" style={{fontFamily:'Space Mono, monospace'}}>Powerful Features</h2>
        <p className="text-center text-[#6b7a8d] text-sm max-w-md mx-auto mb-14 leading-relaxed">Features that actually matter. No bloat, just what you need.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {/* Google signin */}
          <div className="md:col-span-1 bg-[#13171b] border border-[#1f2830] rounded-lg p-7 hover:border-[#00d4ff] hover:-translate-y-1 transition-all">
            <h3 className="font-bold text-base mb-2" style={{fontFamily:'Space Mono, monospace'}}>
              <span className="text-[#00d4ff]">Google</span> Sign-In Only
            </h3>
            <p className="text-[#6b7a8d] text-sm leading-relaxed mb-5">No email, no password. Sign in exclusively with Google in one click.</p>
            <div className="bg-[#1c2026] border border-[#1f2830] rounded-md p-5 text-center">
              <div className="text-[0.72rem] text-[#6b7a8d] mb-3">Your centralized bookmark manager</div>
              <button
                onClick={() => showToast('Google sign-in would redirect you to OAuth!')}
                className="bg-[#00d4ff] text-black font-bold text-[0.76rem] px-5 py-2.5 rounded border-none cursor-pointer flex items-center gap-2 mx-auto hover:bg-[#00b8e0] hover:shadow-[0_0_16px_rgba(0,212,255,0.35)] transition-all"
                style={{fontFamily:'Space Mono, monospace'}}
              >
                <span className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center text-[8px] font-bold">G</span>
                Continue with Google
              </button>
              <div className="text-[0.62rem] text-[#404d5c] mt-2.5">By continuing, you agree to our <u>Terms</u> and <u>Privacy Policy</u></div>
            </div>
          </div>

          {/* Realtime */}
          <div className="bg-[#13171b] border border-[#1f2830] rounded-lg p-7 hover:border-[#00d4ff] hover:-translate-y-1 transition-all">
            <h3 className="font-bold text-base mb-2" style={{fontFamily:'Space Mono, monospace'}}>
              <span className="text-[#00d4ff]">Real-Time</span> Updates
            </h3>
            <p className="text-[#6b7a8d] text-sm leading-relaxed mb-5">Bookmarks sync live across all tabs via Supabase Realtime — zero page refresh.</p>
            <div className="flex flex-col gap-2">
              {[
                {url:'vercel.com/docs/functions', delay:''},
                {url:'github.com/supabase', delay:'0.5s', faded:true},
              ].map(({url,delay,faded}) => (
                <div key={url} className={`bg-[#1c2026] border border-[#263040] rounded px-2.5 py-2 flex items-center gap-2 ${faded?'opacity-45':''}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e57a] flex-shrink-0 animate-pulse" style={{animationDelay:delay}}/>
                  <span className="text-[0.62rem] text-[#6b7a8d] flex-1 truncate">{url}</span>
                  <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-[rgba(0,229,122,0.12)] text-[#00e57a]">New</span>
                </div>
              ))}
              <div className="text-[0.6rem] text-[#404d5c] mt-1">⚡ Powered by Supabase Realtime</div>
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-[#13171b] border border-[#1f2830] rounded-lg p-7 hover:border-[#00d4ff] hover:-translate-y-1 transition-all">
            <h3 className="font-bold text-base mb-2" style={{fontFamily:'Space Mono, monospace'}}>
              <span className="text-[#00d4ff]">Private</span> by Default
            </h3>
            <p className="text-[#6b7a8d] text-sm leading-relaxed mb-5">Row Level Security ensures User A can never see User B's bookmarks. Ever.</p>
            <div className="flex flex-col gap-2">
              <div className="bg-[#1c2026] border border-[#263040] rounded px-2.5 py-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#00d4ff] flex items-center justify-center text-black text-[9px] font-bold flex-shrink-0">A</div>
                <span className="text-[0.62rem] text-[#6b7a8d] flex-1">user-a@gmail.com</span>
                <span className="text-xs">🔒</span>
              </div>
              <div className="bg-[#1c2026] border border-[#263040] rounded px-2.5 py-2 flex items-center gap-2 opacity-30">
                <div className="w-5 h-5 rounded-full bg-[#1f2830] flex items-center justify-center text-[#6b7a8d] text-[9px] font-bold flex-shrink-0">B</div>
                <span className="text-[0.62rem] text-[#6b7a8d] flex-1">user-b@gmail.com</span>
                <span className="text-[0.58rem] text-[#404d5c]">no access</span>
              </div>
              <div className="text-[0.6rem] text-[#404d5c] mt-1">🛡 Supabase RLS enforced</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-[#161a1e] py-24 px-12">
        <h2 className="font-bold text-4xl text-center mb-3" style={{fontFamily:'Space Mono, monospace'}}>Frequently Asked Questions</h2>
        <p className="text-center text-[#6b7a8d] text-sm max-w-md mx-auto mb-14">Straight answers, no fluff</p>

        <div className="max-w-2xl mx-auto divide-y divide-[#1f2830]">
          {FAQS.map(({ q, a }, i) => (
            <div key={q}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full bg-transparent border-none py-5 flex items-center justify-between cursor-pointer text-left gap-4"
              >
                <span className="text-sm text-[#e2eaf2]">{q}</span>
                <span
                  className="text-[#00d4ff] text-xl flex-shrink-0 transition-transform duration-200"
                  style={{transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)'}}
                >+</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 pb-5' : 'max-h-0'}`}>
                <p className="text-[#6b7a8d] text-sm leading-relaxed">{a}</p>
              </div>
            </div>
          ))} 
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#1f2830] px-12 py-7 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 font-bold text-sm" style={{fontFamily:'Space Mono, monospace'}}>
          <span className="w-7 h-7 bg-[#00d4ff] rounded flex items-center justify-center text-black text-xs">🔖</span>
          Stack <span className="text-[#00d4ff]">Mark</span>
        </div>
        <p className="text-[#6b7a8d] text-xs">Built with Next.js · Supabase · Tailwind CSS · Vercel</p>
      </footer>

      {/* ── BACK TO TOP ── */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 right-6 w-10 h-10 bg-[#00d4ff] text-black rounded-md border-none cursor-pointer flex items-center justify-center text-lg z-50 transition-opacity duration-200 ${showBtt ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        ↑
      </button>

    </div>
  )
}