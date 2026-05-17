export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarCliente from '@/components/dashboard/sidebar-cliente'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  if (!DEMO_MODE) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'cliente' && profile.role !== 'admin')) redirect('/login')

    const { data: contract } = await supabase
      .from('client_contracts')
      .select('clips_total')
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .single()

    const planName = contract
      ? contract.clips_total >= 30 ? 'Pro' : contract.clips_total >= 15 ? 'Growth' : 'Starter'
      : 'Starter'

    return (
      <div className="min-h-screen bg-[#0A0A0B]">
        <SidebarCliente userName={profile.name} planName={planName} />
        <main className="md:ml-56 min-h-screen pt-14 md:pt-0">
          <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <SidebarCliente userName="Cliente Demo" planName="Pro" />
      <main className="md:ml-56 min-h-screen pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
