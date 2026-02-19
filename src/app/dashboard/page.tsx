import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookmarkClient from './BookmarkClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: bookmarks }, { data: categories }] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('id, title, url, description, category, og_image, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('id, name, icon, color, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  console.log('Server fetch — first bookmark:', bookmarks?.[0])
  console.log('Server fetch — categories:', categories)

  return (
    <BookmarkClient
      initialBookmarks={bookmarks ?? []}
      initialCategories={categories ?? []}
      user={user}
    />
  )
}