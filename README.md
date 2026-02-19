# Stack Mark 🔖

A real-time bookmark manager built with Next.js 14 App Router, Supabase, and Tailwind CSS. Users can save, categorize, and manage links with instant sync across browser tabs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Realtime | Supabase Realtime (postgres_changes) |
| Storage | Supabase Storage |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## Features

- Google OAuth sign-in
- Add, edit, delete bookmarks with title, URL, description, category, OG image
- Auto-fetch Open Graph metadata (title, description, preview image) from any URL
- Custom image upload stored in Supabase Storage
- Real-time sync — changes appear instantly across all open tabs without refresh
- Categories with custom icons and colors, persisted to database
- Bookmarks grouped by category with collapsible sections
- Row Level Security — users can only read and write their own data
- Search/filter bookmarks by title or URL

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/stack-mark.git
cd stack-mark
npm install
```

### 2. Supabase — run this SQL

```sql
create table bookmarks (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  url         text not null,
  description text,
  category    text,
  og_image    text,
  created_at  timestamptz default now()
);

alter table bookmarks enable row level security;
create policy "select own" on bookmarks for select using (auth.uid() = user_id);
create policy "insert own" on bookmarks for insert with check (auth.uid() = user_id);
create policy "update own" on bookmarks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on bookmarks for delete using (auth.uid() = user_id);

create table categories (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  icon       text not null default '📁',
  color      text not null default '#00d4ff',
  created_at timestamptz default now()
);

alter table categories enable row level security;
create policy "select own" on categories for select using (auth.uid() = user_id);
create policy "insert own" on categories for insert with check (auth.uid() = user_id);
create policy "delete own" on categories for delete using (auth.uid() = user_id);
```

### 3. Supabase — enable Realtime

Dashboard → Database → Replication → enable `bookmarks` table for INSERT, UPDATE, DELETE.

### 4. Supabase — create Storage bucket

Dashboard → Storage → New bucket → name: `og-images` → Public.

### 5. Google OAuth

- Google Cloud Console → Create OAuth 2.0 Client ID
- Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
- Supabase Dashboard → Authentication → Providers → Google → paste Client ID + Secret
- Add redirect URL in Supabase: `http://localhost:3000/auth/callback`

### 6. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 7. Run

```bash
npm run dev
```

---

## Project Structure

```
src/
├── middleware.ts                  # Refreshes session cookie on every request
├── lib/supabase/
│   ├── client.ts                  # Browser Supabase client
│   └── server.ts                  # Server Supabase client (SSR-safe)
├── components/
│   └── LandingPage.tsx            # Interactive landing page (client component)
└── app/
    ├── page.tsx                   # Server component — auth check, renders landing
    ├── login/page.tsx             # Google OAuth trigger
    ├── auth/callback/route.ts     # Exchanges OAuth code for session
    ├── api/og/route.ts            # Fetches OG metadata from external URLs
    └── dashboard/
        ├── page.tsx               # Server — fetches bookmarks + categories
        ├── BookmarkClient.tsx     # Client — UI, realtime, all CRUD
        └── loading.tsx            # Skeleton loading state
```
--

# Real Problems Encountered (Top 5)

---

## 1️⃣ Silent UPDATE Failures Due to Missing RLS Policy

**Problem:**  
UI showed successful edits, but data reverted after refresh.

**Root Cause:**  
Row Level Security (RLS) policy for `UPDATE` was missing.  
Supabase silently blocked the update operation, while the frontend state updated optimistically.

**Fix:**

```sql
create policy "Users update own bookmarks"
on bookmarks
for update
using (auth.uid() = user_id);
```

**What This Demonstrates:**  
Understanding that the database is the source of truth — not frontend state. Security layers must explicitly allow each operation.

---

## 2️⃣ Category Column Writing `null` Due to Schema + RLS Mismatch

**Problem:**  
`INSERT` appeared successful, but the `category` column persisted as `null` after refresh.

**Root Cause:**  
The column was added after initial RLS policies were created.  
Policies did not fully align with the evolved schema.

The issue was only discovered after validating with:

```ts
.insert(data)
.select()
```

**Fix:**  
- Recreated the table with full schema definition.
- Realigned `INSERT` and `UPDATE` policies with the schema.
- Began validating all writes using `.select()` after mutations.

**What This Demonstrates:**  
Database-layer debugging, not just React state inspection.  
Schema evolution and security policies must stay aligned.

---

## 3️⃣ Realtime Failing Due to Replica Identity + Channel Behavior

**Problem:**  
`INSERT` worked, but `UPDATE` and `DELETE` events did not broadcast properly across tabs.

**Root Causes:**

- `REPLICA IDENTITY FULL` was not set (no full payload for updates/deletes).
- Channel deduplication occurred when multiple tabs used the same channel name.
- Subscription filters were not properly configured.

**Fix:**

```sql
alter table bookmarks replica identity full;
```

- Assigned unique channel names per client.
- Consolidated listeners using wildcard (`'*'`) events.
- Verified publication → filter → payload flow.

**What This Demonstrates:**  
Infrastructure-level realtime debugging.  
Understanding of Postgres replication mechanics, websocket behavior, and Supabase channel architecture.

---

## 4️⃣ OAuth Flow Mismatch (Implicit vs PKCE)

**Problem:**  
OAuth login succeeded, but SSR sessions failed.  
`getSession()` in middleware returned `null`.

**Root Cause:**  
Implicit flow was enabled instead of PKCE.  
Implicit flow does not properly support secure SSR session handling.

**Fix:**  
- Enabled PKCE flow.
- Corrected redirect URL configuration.
- Ensured proper callback handling for server-side session validation.

**What This Demonstrates:**  
Understanding of OAuth flow differences and authentication architecture in SSR environments.

---

## 5️⃣ Callback Cookies Not Persisting in Middleware

**Problem:**  
Login succeeded, but session did not persist across requests.

**Root Cause:**  
Cookies were not properly attached to `NextResponse` inside middleware.  
The session token was generated but never propagated through the response lifecycle.

**Fix:**  
- Ensured cookies were forwarded correctly in middleware.
- Properly returned modified `NextResponse` with updated headers.

**What This Demonstrates:**  
Deep understanding of Next.js App Router middleware, request/response lifecycle, and SSR cookie handling.

---

# Summary

These issues required debugging across:

- Row Level Security (RLS)
- Schema evolution
- Postgres replication
- Supabase realtime infrastructure
- OAuth authentication flows
- Next.js SSR middleware lifecycle

This project moved beyond frontend implementation into database security, infrastructure behavior, and authentication architecture.
---

## Deployment

```bash
# 1. Push to GitHub
# 2. Import to Vercel, add env vars:
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
# 3. After deploy, update in Supabase:
#    Site URL → https://your-app.vercel.app
#    Redirect URLs → https://your-app.vercel.app/auth/callback
# 4. Update Google Cloud Console:
#    Authorized redirect URI → https://your-project.supabase.co/auth/v1/callback
```

---


