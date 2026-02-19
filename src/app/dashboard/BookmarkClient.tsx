'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

type Bookmark = {
  id: string
  title: string
  url: string
  description?: string | null
  category?: string | null
  og_image?: string | null
  created_at: string
}

type Category = {
  id: string
  name: string
  icon: string
  color: string
  created_at?: string
}

const CATEGORY_ICONS = [
  '📁','🔖','💼','📄','⭐','❤️','👍','⚙️','🏆','🥇',
  '▶️','🎬','🎵','🖼️','🎸','📊','⚡','🌀','✂️',
  '💬','📧','🔗','🌐','🛠️','🎯','📌','💡','📦','🚀','🔬','🧠','💻',
]

const PRESET_COLORS = [
  '#00d4ff','#ff4d6a','#00e57a','#f59e0b',
  '#a78bfa','#3b82f6','#ec4899','#ff6b35',
]

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function getFaviconUrl(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128` }
  catch { return null }
}

export default function BookmarkClient({
  initialBookmarks,
  initialCategories,
  user,
}: {
  initialBookmarks: Bookmark[]
  initialCategories: Category[]
  user: User
}) {
  const router = useRouter()

  // Create supabase client once using ref — stable across renders, has session
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [bookmarks, setBookmarks]             = useState<Bookmark[]>(initialBookmarks)
  const [categories, setCategories]           = useState<Category[]>(initialCategories)
  const [query, setQuery]                     = useState('')
  const [activeNav, setActiveNav]             = useState('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [bmModal, setBmModal]           = useState(false)
  const [editId, setEditId]             = useState<string | null>(null)
  const [urlVal, setUrlVal]             = useState('')
  const [titleVal, setTitleVal]         = useState('')
  const [descVal, setDescVal]           = useState('')
  const [catVal, setCatVal]             = useState('Uncategorized')
  const [ogPreview, setOgPreview]       = useState<string | null>(null)
  const [ogFile, setOgFile]             = useState<File | null>(null)
  const [bmLoading, setBmLoading]       = useState(false)
  const [autoFetching, setAutoFetching] = useState(false)

  const [catModal, setCatModal]   = useState(false)
  const [catName, setCatName]     = useState('')
  const [catIcon, setCatIcon]     = useState('📁')
  const [catColor, setCatColor]   = useState('#00d4ff')
  const [catSaving, setCatSaving] = useState(false)

  const [toast, setToast]               = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Unique channel per tab — critical to prevent Supabase deduplication
    const channelName = `bookmarks-${user.id}-${Math.random().toString(36).slice(2)}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookmarks' },
        (payload) => {
          console.log('[Realtime] event:', payload.eventType, payload)
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as Bookmark
            setBookmarks(prev =>
              prev.some(b => b.id === newRow.id) ? prev : [newRow, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Bookmark
            setBookmarks(prev => prev.map(b => b.id === updated.id ? updated : b))
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setBookmarks(prev => prev.filter(b => b.id !== deleted.id))
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] status:', status, err ?? '')
      })

    return () => { supabase.removeChannel(channel) }
  }, [user.id])

  // ── Keyboard shortcut ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeBmModal(); closeCatModal() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ── Auto-fetch OG metadata when URL typed ────────────────────────────────
  useEffect(() => {
    if (!urlVal || editId) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        new URL(urlVal) // validate
        setAutoFetching(true)
        const res = await fetch(`/api/og?url=${encodeURIComponent(urlVal)}`)
        if (!cancelled && res.ok) {
          const d = await res.json()
          if (d.ogTitle && !titleVal) setTitleVal(d.ogTitle.slice(0, 100))
          if (d.ogDesc  && !descVal)  setDescVal(d.ogDesc.slice(0, 300))
          if (d.ogImage && !ogFile)   setOgPreview(d.ogImage)
        }
      } catch { /* invalid url or fetch failed — ignore */ }
      finally { if (!cancelled) setAutoFetching(false) }
    }, 900)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [urlVal])

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000)
  }

  // ── Bookmark modal ────────────────────────────────────────────────────────
  function openBmModal(bm?: Bookmark) {
    if (bm) {
      setEditId(bm.id)
      setUrlVal(bm.url)
      setTitleVal(bm.title)
      setDescVal(bm.description ?? '')
      setCatVal(bm.category?.trim() || 'Uncategorized')
      setOgPreview(bm.og_image ?? null)
      setOgFile(null)
    } else {
      setEditId(null); setUrlVal(''); setTitleVal(''); setDescVal('')
      setCatVal('Uncategorized'); setOgPreview(null); setOgFile(null)
    }
    setBmModal(true)
  }

  function closeBmModal() {
    setBmModal(false); setEditId(null); setUrlVal(''); setTitleVal('')
    setDescVal(''); setCatVal('Uncategorized'); setOgPreview(null); setOgFile(null)
  }

  async function uploadOgImage(file: File): Promise<string | null> {
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('og-images')
        .upload(path, file, { upsert: true })
      if (error) return null
      return supabase.storage.from('og-images').getPublicUrl(path).data.publicUrl
    } catch { return null }
  }

  async function saveBookmark() {
    if (!urlVal.trim() || !titleVal.trim()) {
      showToast('⚠ Fill in URL and Title')
      return
    }
    setBmLoading(true)

    // Resolve image — custom upload wins over auto-fetched
    let og_image: string | null = ogPreview ?? null
    if (ogFile) {
      const uploaded = await uploadOgImage(ogFile)
      if (uploaded) og_image = uploaded
    }

    // Snapshot category NOW — freeze value before any awaits
    const category = catVal?.trim() || 'Uncategorized'

    if (editId) {
      const { data, error } = await supabase
        .from('bookmarks')
        .update({ title: titleVal.trim(), url: urlVal.trim(), description: descVal.trim() || null, category, og_image })
        .eq('id', editId)
        .select('id, title, url, description, category, og_image, created_at')

      if (error) {
        showToast('❌ ' + error.message)
      } else if (data && data.length > 0) {
        setBookmarks(prev => prev.map(b => b.id === editId ? data[0] : b))
        showToast('✓ Bookmark updated')
      } else {
        showToast('❌ No rows updated — check RLS policies')
      }

    } else {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({ title: titleVal.trim(), url: urlVal.trim(), description: descVal.trim() || null, category, og_image, user_id: user.id })
        .select('id, title, url, description, category, og_image, created_at')

      if (error) {
        showToast('❌ ' + error.message)
      } else if (data && data.length > 0) {
        setBookmarks(prev =>
          prev.some(b => b.id === data[0].id) ? prev : [data[0], ...prev]
        )
        showToast('✅ Bookmark successfully added!')
      } else {
        showToast('❌ Insert returned no data')
      }
    }

    setBmLoading(false)
    closeBmModal()
  }

  async function deleteBookmark(id: string) {
    // Optimistic
    setBookmarks(prev => prev.filter(b => b.id !== id))
    const { error } = await supabase.from('bookmarks').delete().eq('id', id)
    if (error) {
      showToast('❌ Delete failed')
      // Restore by refetching
      const { data } = await supabase
        .from('bookmarks')
        .select('id, title, url, description, category, og_image, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setBookmarks(data)
    } else {
      showToast('🗑 Bookmark deleted')
    }
  }

  // ── Category modal ────────────────────────────────────────────────────────
  function openCatModal() {
    setCatName(''); setCatIcon('📁'); setCatColor('#00d4ff'); setCatModal(true)
  }
  function closeCatModal() {
    setCatModal(false); setCatName(''); setCatIcon('📁'); setCatColor('#00d4ff')
  }

  async function saveCategory() {
    if (!catName.trim()) { showToast('⚠ Enter a category name'); return }
    setCatSaving(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: catName.trim(), icon: catIcon, color: catColor, user_id: user.id })
      .select()
    if (error) {
      showToast('❌ ' + error.message)
    } else if (data && data.length > 0) {
      setCategories(prev => [...prev, data[0]])
      showToast(`✓ Category "${data[0].name}" created`)
    }
    setCatSaving(false)
    closeCatModal()
  }

  async function deleteCategory(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id))
    if (activeNav === id) setActiveNav('all')
    await supabase.from('categories').delete().eq('id', id)
  }

  function toggleGroup(name: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function signOut() {
    try { await supabase.auth.signOut() } catch { /* ignore */ }
    window.location.href = '/'
  }

  // ── Filter + group ────────────────────────────────────────────────────────
  const filtered = bookmarks.filter(b => {
    const matchQ = b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.url.toLowerCase().includes(query.toLowerCase())
    if (activeNav === 'all') return matchQ
    const cat = categories.find(c => c.id === activeNav)
    return matchQ && (b.category?.trim() || 'Uncategorized') === (cat?.name ?? '')
  })

  const grouped = filtered.reduce<Record<string, Bookmark[]>>((acc, b) => {
    const key = b.category?.trim() || 'Uncategorized'
    acc[key] = acc[key] ?? []
    acc[key].push(b)
    return acc
  }, {})

  const activeCatName = activeNav === 'all'
    ? 'All Bookmarks'
    : categories.find(c => c.id === activeNav)?.name ?? 'All Bookmarks'

  const userInitial = (user.email ?? 'U')[0].toUpperCase()
  const inp = "w-full bg-[#1a1e24] border border-[#263040] rounded-md px-3 py-2.5 text-sm text-[#e2eaf2] outline-none focus:border-[#00d4ff] placeholder-[#404d5c] transition-colors"

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#111417] text-[#e2eaf2] overflow-hidden" style={{fontFamily:'Courier Prime, monospace'}}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 border-r border-[#1f2830] flex flex-col bg-[#0e1114]">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1f2830]">
          <span className="w-8 h-8 bg-[#00d4ff] rounded-md flex items-center justify-center text-black text-sm">🔖</span>
          <span className="font-bold text-base" style={{fontFamily:'Space Mono, monospace'}}>
            Stack <span className="text-[#00d4ff]">Mark</span>
          </span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          <div className="text-[0.6rem] text-[#404d5c] uppercase tracking-widest mb-2 px-2">Library</div>

          <button
            onClick={() => setActiveNav('all')}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-md text-sm border-none cursor-pointer transition-all ${
              activeNav === 'all'
                ? 'bg-[rgba(0,212,255,0.12)] text-[#00d4ff]'
                : 'bg-transparent text-[#6b7a8d] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#e2eaf2]'
            }`}
          >
            <span>🏠</span> All Bookmarks
          </button>

          {categories.map(cat => (
            <div key={cat.id} className="group/cat relative flex items-center">
              <button
                onClick={() => setActiveNav(cat.id)}
                className={`flex-1 text-left flex items-center gap-2.5 px-3 py-2 rounded-md text-sm border-none cursor-pointer transition-all ${
                  activeNav === cat.id
                    ? 'bg-[rgba(0,212,255,0.12)] text-[#00d4ff]'
                    : 'bg-transparent text-[#6b7a8d] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#e2eaf2]'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="truncate">{cat.name}</span>
              </button>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="absolute right-1 opacity-0 group-hover/cat:opacity-100 w-5 h-5 flex items-center justify-center text-[#404d5c] hover:text-[#ff4d6a] bg-transparent border-none cursor-pointer text-xs rounded transition-all"
              >✕</button>
            </div>
          ))}

          <div className="mt-3 pt-3 border-t border-[#1f2830]">
            <button
              onClick={openCatModal}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#6b7a8d] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.05)] transition-all border-none cursor-pointer bg-transparent"
            >
              <span className="font-bold text-base leading-none">+</span> Add Category
            </button>
          </div>
        </nav>

        <div className="border-t border-[#1f2830] p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-[#00d4ff] flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs text-[#e2eaf2] truncate font-medium">{user.user_metadata?.full_name ?? 'User'}</div>
              <div className="text-[0.65rem] text-[#6b7a8d] truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full mt-1 text-[0.7rem] text-[#6b7a8d] hover:text-[#ff4d6a] transition-colors text-left px-2 py-1 bg-transparent border-none cursor-pointer"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#1f2830] flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-[#6b7a8d]">
            <span>🏠</span>
            <span className="text-[#263040]">/</span>
            <span className="text-[#e2eaf2] font-medium">{activeCatName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#404d5c] pointer-events-none">🔍</span>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                className="bg-[#1c2026] border border-[#1f2830] rounded-md pl-9 pr-10 py-2 text-sm text-[#e2eaf2] w-52 outline-none focus:border-[#00d4ff] placeholder-[#404d5c] transition-colors"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.58rem] text-[#404d5c] bg-[#1a1e24] px-1.5 py-0.5 rounded pointer-events-none">⌘K</span>
            </div>
            <button
              onClick={() => openBmModal()}
              className="flex items-center gap-2 bg-[#00d4ff] text-black font-bold text-sm px-4 py-2 rounded-md border-none cursor-pointer hover:bg-[#00b8e0] hover:shadow-[0_0_16px_rgba(0,212,255,0.3)] transition-all whitespace-nowrap"
              style={{fontFamily:'Space Mono, monospace'}}
            >
              + Add Bookmark
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-5">
            <h1 className="font-bold text-2xl" style={{fontFamily:'Space Mono, monospace'}}>{activeCatName}</h1>
            <p className="text-[#6b7a8d] text-sm mt-1">{filtered.length} bookmark{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          {filtered.length === 0 && (
            <div className="border border-dashed border-[#1f2830] rounded-xl flex flex-col items-center justify-center py-24 gap-5">
              <div className="w-16 h-16 bg-[#1c2026] rounded-xl flex items-center justify-center text-3xl">🔖</div>
              <div className="text-center">
                <p className="font-bold text-base mb-1" style={{fontFamily:'Space Mono, monospace'}}>No bookmarks yet</p>
                <p className="text-[#6b7a8d] text-sm">Get started by adding your first bookmark</p>
              </div>
              <button
                onClick={() => openBmModal()}
                className="flex items-center gap-2 bg-[#00d4ff] text-black font-bold text-sm px-5 py-2.5 rounded-md border-none cursor-pointer hover:bg-[#00b8e0] transition-colors"
                style={{fontFamily:'Space Mono, monospace'}}
              >
                + Add Bookmark
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex flex-col gap-8">
              {Object.entries(grouped).map(([groupName, bms]) => {
                const collapsed = collapsedGroups.has(groupName)
                return (
                  <div key={groupName}>
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full flex items-center justify-between py-2 border-b border-[#1f2830] mb-4 bg-transparent border-t-0 border-l-0 border-r-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="text-[#6b7a8d] transition-transform duration-200 inline-block"
                          style={{transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)'}}
                        >▾</span>
                        <span>📁</span>
                        <span className="font-medium text-[#e2eaf2]">{groupName}</span>
                      </div>
                      <span className="text-xs text-[#404d5c]">{bms.length} bookmark{bms.length !== 1 ? 's' : ''}</span>
                    </button>
                    {!collapsed && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {bms.map(bm => (
                          <BookmarkCard
                            key={bm.id}
                            bm={bm}
                            onEdit={() => openBmModal(bm)}
                            onDelete={() => deleteBookmark(bm.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── ADD/EDIT BOOKMARK PANEL ──────────────────────────────────────── */}
      {bmModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
          onClick={e => { if (e.target === e.currentTarget) closeBmModal() }}
        >
          <div className="h-full w-[440px] bg-[#161a1e] border-l border-[#263040] flex flex-col shadow-2xl">
            <div className="flex items-start justify-between p-6 border-b border-[#1f2830]">
              <div>
                <h2 className="font-bold text-base" style={{fontFamily:'Space Mono, monospace'}}>
                  {editId ? 'Edit Bookmark' : 'Add Bookmark'}
                </h2>
                <p className="text-[#6b7a8d] text-xs mt-1">Save a new link to your collection.</p>
              </div>
              <button onClick={closeBmModal} className="text-[#6b7a8d] hover:text-[#e2eaf2] text-xl bg-transparent border-none cursor-pointer w-8 h-8 flex items-center justify-center rounded">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold mb-2">URL <span className="text-[#00d4ff]">*</span></label>
                <input
                  type="url" value={urlVal} onChange={e => setUrlVal(e.target.value)}
                  placeholder="https://example.com" autoFocus
                  className={`${inp} ${urlVal ? 'border-[#00d4ff]' : ''}`}
                />
                {autoFetching && (
                  <p className="text-[0.65rem] text-[#00d4ff] mt-1 animate-pulse">⚡ Fetching title & description…</p>
                )}
              </div>

              {ogPreview && !ogFile && (
                <div className="relative rounded-lg overflow-hidden border border-[#263040]">
                  <img src={ogPreview} alt="Preview" className="w-full h-32 object-cover" onError={() => setOgPreview(null)} />
                  <button onClick={() => setOgPreview(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full border-none cursor-pointer text-xs flex items-center justify-center">✕</button>
                  <div className="absolute bottom-2 left-2 text-[0.6rem] bg-black/60 text-[#00d4ff] px-2 py-0.5 rounded" style={{fontFamily:'Space Mono, monospace'}}>Auto-fetched</div>
                </div>
              )}

              {ogFile && (
                <div className="relative rounded-lg overflow-hidden border border-[#263040]">
                  <img src={URL.createObjectURL(ogFile)} alt="Upload preview" className="w-full h-32 object-cover" />
                  <button onClick={() => setOgFile(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full border-none cursor-pointer text-xs flex items-center justify-center">✕</button>
                  <div className="absolute bottom-2 left-2 text-[0.6rem] bg-black/60 text-[#00e57a] px-2 py-0.5 rounded" style={{fontFamily:'Space Mono, monospace'}}>Custom image ✓</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-2">Title <span className="text-[#00d4ff]">*</span></label>
                <input type="text" value={titleVal} onChange={e => setTitleVal(e.target.value)} placeholder="Enter bookmark title" className={inp} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea value={descVal} onChange={e => setDescVal(e.target.value)} placeholder="Optional description" rows={3} className={`${inp} resize-y`} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Category</label>
                <div className="relative">
                  <select
                    value={catVal}
                    onChange={e => setCatVal(e.target.value)}
                    className={`${inp} appearance-none cursor-pointer pr-8`}
                    style={{background:'#1a1e24'}}
                  >
                    <option value="Uncategorized">Uncategorized</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7a8d] pointer-events-none">⌄</span>
                </div>
                <p className="text-[0.65rem] text-[#6b7a8d] mt-1">
                  Selected: <span className="text-[#00d4ff]">{catVal}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Custom OG image <span className="text-[#6b7a8d] font-normal">(optional)</span>
                </label>
                <input
                  type="file" accept="image/*"
                  onChange={e => { const f = e.target.files?.[0] ?? null; setOgFile(f); if (f) setOgPreview(null) }}
                  className="w-full bg-[#1a1e24] border border-[#263040] rounded-md px-3 py-2 text-sm text-[#6b7a8d] cursor-pointer file:bg-[#263040] file:border-none file:text-[#e2eaf2] file:text-xs file:px-3 file:py-1 file:rounded file:cursor-pointer file:mr-3"
                />
                <p className="text-[0.65rem] text-[#404d5c] mt-1">If empty, OG image is fetched automatically.</p>
              </div>
            </div>

            <div className="p-6 border-t border-[#1f2830] flex flex-col gap-2.5">
              <button onClick={closeBmModal} className="w-full py-3 bg-[#1c2026] border border-[#263040] text-[#e2eaf2] text-sm rounded-md cursor-pointer hover:border-[#404d5c] transition-colors" style={{fontFamily:'Space Mono, monospace'}}>
                Cancel
              </button>
              <button onClick={saveBookmark} disabled={bmLoading} className="w-full py-3 bg-[#00d4ff] text-black font-bold text-sm rounded-md border-none cursor-pointer hover:bg-[#00b8e0] disabled:opacity-50 transition-colors" style={{fontFamily:'Space Mono, monospace'}}>
                {bmLoading ? 'Saving…' : editId ? 'Update Bookmark' : 'Add Bookmark'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CATEGORY PANEL ───────────────────────────────────────────── */}
      {catModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
          onClick={e => { if (e.target === e.currentTarget) closeCatModal() }}
        >
          <div className="h-full w-[440px] bg-[#161a1e] border-l border-[#263040] flex flex-col shadow-2xl">
            <div className="flex items-start justify-between p-6 border-b border-[#1f2830]">
              <div>
                <h2 className="font-bold text-base" style={{fontFamily:'Space Mono, monospace'}}>Add Category</h2>
                <p className="text-[#6b7a8d] text-xs mt-1">Create a new category to organize your bookmarks.</p>
              </div>
              <button onClick={closeCatModal} className="text-[#6b7a8d] hover:text-[#e2eaf2] text-xl bg-transparent border-none cursor-pointer w-8 h-8 flex items-center justify-center rounded">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold mb-2">Name <span className="text-[#00d4ff]">*</span></label>
                <input
                  type="text" value={catName} onChange={e => setCatName(e.target.value)}
                  placeholder="e.g., Tech, Learning, Jobs" autoFocus
                  className={`${inp} border-[#00d4ff]`}
                  onKeyDown={e => { if (e.key === 'Enter') saveCategory() }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-3">Icon</label>
                <div className="flex items-center gap-3 p-3 bg-[#1a1e24] border border-[#263040] rounded-md mb-3">
                  <span className="text-2xl">{catIcon}</span>
                  <span className="text-sm text-[#6b7a8d]">{catName || 'Select an icon for your category'}</span>
                </div>
                <div className="bg-[#1a1e24] border border-[#263040] rounded-md p-3 max-h-56 overflow-y-auto">
                  {(['General','Media','Tech'] as const).map((section, si) => (
                    <div key={section}>
                      <p className="text-[0.65rem] text-[#6b7a8d] uppercase tracking-widest mb-2 mt-2">{section}</p>
                      <div className="grid grid-cols-6 gap-1.5 mb-2">
                        {CATEGORY_ICONS.slice(si * 10, si * 10 + 10).map(icon => (
                          <button
                            key={icon} onClick={() => setCatIcon(icon)}
                            className={`w-9 h-9 flex items-center justify-center rounded-md text-lg border transition-all cursor-pointer ${
                              catIcon === icon ? 'border-[#00d4ff] bg-[rgba(0,212,255,0.12)]' : 'border-[#263040] bg-transparent hover:border-[#404d5c]'
                            }`}
                          >{icon}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3">Color <span className="text-[#6b7a8d] font-normal">(Optional)</span></label>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c} onClick={() => setCatColor(c)}
                      className={`w-8 h-8 rounded-md cursor-pointer transition-all border-2 ${catColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{background: c}}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-[#1a1e24] border border-[#263040] rounded-md px-3 py-2.5">
                  <div className="w-8 h-5 rounded flex-shrink-0" style={{background: catColor}} />
                  <input type="text" value={catColor} onChange={e => setCatColor(e.target.value)} placeholder="#00d4ff" className="bg-transparent text-sm text-[#e2eaf2] outline-none flex-1" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#1f2830] flex flex-col gap-2.5">
              <button onClick={closeCatModal} className="w-full py-3 bg-[#1c2026] border border-[#263040] text-[#e2eaf2] text-sm rounded-md cursor-pointer hover:border-[#404d5c] transition-colors" style={{fontFamily:'Space Mono, monospace'}}>Cancel</button>
              <button onClick={saveCategory} disabled={catSaving} className="w-full py-3 bg-[#00d4ff] text-black font-bold text-sm rounded-md border-none cursor-pointer hover:bg-[#00b8e0] disabled:opacity-50 transition-colors" style={{fontFamily:'Space Mono, monospace'}}>
                {catSaving ? 'Creating…' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ────────────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c2026] border border-[#00d4ff] text-[#00d4ff] text-sm px-6 py-3 rounded-lg z-[60] transition-all duration-300 whitespace-nowrap pointer-events-none shadow-lg ${
          toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
        style={{fontFamily:'Space Mono, monospace'}}
      >
        {toast}
      </div>
    </div>
  )
}

// ── BookmarkCard ─────────────────────────────────────────────────────────────
function BookmarkCard({
  bm, onEdit, onDelete,
}: {
  bm: Bookmark; onEdit: () => void; onDelete: () => void
}) {
  const [imgErr, setImgErr] = useState(false)
  const favicon = getFaviconUrl(bm.url)
  const showOg  = !!bm.og_image && !imgErr

  return (
    <div className="group bg-[#161a1e] border border-[#1f2830] rounded-xl overflow-hidden hover:border-[#00d4ff] hover:-translate-y-0.5 transition-all">
      <div className="relative h-36 bg-gradient-to-br from-[#1c2026] to-[#0e1114] border-b border-[#1f2830] overflow-hidden">
        {showOg ? (
          <img src={bm.og_image!} alt={bm.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : favicon ? (
          <div className="w-full h-full flex items-center justify-center">
            <img src={favicon} alt="" className="w-14 h-14 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🔗</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-start justify-end p-2 gap-1 opacity-0 group-hover:opacity-100">
          <a href={bm.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center rounded bg-[#1c2026]/90 text-[#e2eaf2] hover:text-[#00d4ff] text-xs no-underline">↗</a>
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="w-7 h-7 flex items-center justify-center rounded bg-[#1c2026]/90 text-[#e2eaf2] hover:text-[#00d4ff] text-xs border-none cursor-pointer">✏</button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="w-7 h-7 flex items-center justify-center rounded bg-[#1c2026]/90 text-[#e2eaf2] hover:text-[#ff4d6a] text-xs border-none cursor-pointer">🗑</button>
        </div>
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-[#e2eaf2] truncate" style={{fontFamily:'Space Mono, monospace'}}>{bm.title}</p>
        {bm.description && (
          <p className="text-[0.68rem] text-[#6b7a8d] mt-1 line-clamp-2 leading-relaxed">{bm.description}</p>
        )}
        <p className="text-[0.65rem] text-[#404d5c] mt-2">{getDomain(bm.url)}</p>
      </div>
    </div>
  )
}