export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarEditor from '@/components/dashboard/sidebar-editor'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  if (!DEMO_MODE) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'editor' && profile.role !== 'admin')) redirect('/login')

    return (
      <div className="min-h-screen bg-[#0A0A0B]">
        <SidebarEditor userName={profile.name} />
        <main className="md:ml-56 min-h-screen pt-14 md:pt-0">
          <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <SidebarEditor userName="Editor Demo" />
      <main className="ml-56 min-h-screen">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
