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

---
