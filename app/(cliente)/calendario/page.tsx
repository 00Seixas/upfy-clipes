export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarioClient from '@/components/cliente/calendario-client'

interface ScheduledPost {
  id: string
  platform: 'tiktok' | 'instagram'
  scheduled_at: string
  caption: string | null
  status: 'pending' | 'posted' | 'failed'
  posted_at: string | null
  deliverable_id: string | null
  deliverables: { clip_number: number } | null
}

interface ApprovedClip {
  id: string
  clip_number: number
  delivered_at: string
}

export default async function CalendarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const userId = user?.id ?? ''

  // Get client's order IDs
  const { data: clientOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('client_id', userId)

  const orderIds = (clientOrders ?? []).map((o: { id: string }) => o.id)

  // Fetch scheduled posts and approved clips in parallel
  const [scheduledResult, clipsResult] = await Promise.all([
    supabase
      .from('scheduled_posts')
      .select(`
        id,
        platform,
        scheduled_at,
        caption,
        status,
        posted_at,
        deliverable_id,
        deliverables(clip_number)
      `)
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true }),

    orderIds.length
      ? supabase
          .from('deliverables')
          .select('id, clip_number, delivered_at')
          .in('order_id', orderIds)
          .not('client_approved_at', 'is', null)
          .order('delivered_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const scheduledPosts = (scheduledResult.data ?? []) as unknown as ScheduledPost[]
  const approvedClips = (clipsResult.data ?? []) as ApprovedClip[]

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Calendário</h1>
      <p className="text-zinc-400 text-sm mb-8">Agende e visualize suas postagens.</p>
      <CalendarioClient scheduledPosts={scheduledPosts} approvedClips={approvedClips} />
    </div>
  )
}
