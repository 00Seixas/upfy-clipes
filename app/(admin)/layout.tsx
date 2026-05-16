export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarAdmin from '@/components/dashboard/sidebar-admin'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!DEMO_MODE) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') redirect('/login')

    return (
      <div className="min-h-screen bg-[#0A0A0B]">
        <SidebarAdmin userName={profile.name} />
        <main className="md:ml-56 min-h-screen pt-14 md:pt-0">
          <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <SidebarAdmin userName="Admin UPFY" />
      <main className="ml-56 min-h-screen">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
