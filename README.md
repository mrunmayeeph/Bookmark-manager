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

# 🚧 Real Problems Encountered & How They Were Solved

---

## 1️⃣ Silent Data Reverting Due to Missing UPDATE RLS Policy

**Problem:**  
Bookmarks appeared to update correctly in the UI, but after refreshing the page, the old data returned from the database.

**Root Cause:**  
Row Level Security (RLS) policies were created for `SELECT`, `INSERT`, and `DELETE` — but `UPDATE` was missing.  
Supabase blocks `UPDATE` operations when no `UPDATE` policy exists, and it does so silently.

**Fix:**  

```sql
create policy "Users update own bookmarks"
on bookmarks
for update
using (auth.uid() = user_id);
```

**Lesson Learned:**  
Frontend state is not proof of persistence. Always validate against the database when debugging.

---

## 2️⃣ Category Column Saving as `null` Despite Correct UI State

**Problem:**  
New bookmarks showed the correct category in React state but reverted to `"Uncategorized"` after refresh.

**Root Cause:**  
The `category` column was added after initial RLS policies were created. Inserts were accepted, but the new column was written as `null`.  
This created a mismatch between frontend state and actual database state.

**Fix:**  
- Recreated the table with all columns defined together.  
- Confirmed `INSERT` and `UPDATE` policies aligned with the schema.  
- Began using `.select()` after inserts to verify actual DB writes.

**Lesson Learned:**  
Schema evolution + RLS must be aligned. Silent failures can occur when security policies don't reflect updated schema.

---

## 3️⃣ Realtime UPDATE & DELETE Events Not Broadcasting

**Problem:**  
`INSERT` events worked, but `UPDATE` and `DELETE` changes did not propagate across tabs.

**Root Cause:**  
Postgres `REPLICA IDENTITY` was not set to `FULL`.  
Without it, `UPDATE` and `DELETE` events lacked full row payloads, making realtime handlers ineffective.

**Fix:**  

```sql
alter table bookmarks replica identity full;
```

**Lesson Learned:**  
Realtime systems depend on database replication configuration — not just frontend subscriptions.

---

## 4️⃣ Realtime Not Working Across Tabs Due to Channel Deduplication

**Problem:**  
Only one tab received realtime events, even though both were subscribed.

**Root Cause:**  
Both tabs used the same channel name, causing Supabase to internally deduplicate connections.

**Fix:**  
- Ensured unique channel names per client instance.  
- Consolidated event handling into a single wildcard (`'*'`) listener.

**Lesson Learned:**  
Realtime debugging requires validating connection → publication → filter → payload, not just subscription status.

---

## 5️⃣ Hydration Mismatch in Next.js Due to Time-Based Rendering

**Problem:**  
React hydration warnings appeared due to time-based UI (`timeAgo()` using `Date.now()`).

**Root Cause:**  
Server-rendered output differed slightly from client-rendered output due to timing differences.

**Fix:**  
Used `suppressHydrationWarning` for dynamic timestamp elements.

**Lesson Learned:**  
Server and client rendering must produce identical initial output in the App Router.

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

