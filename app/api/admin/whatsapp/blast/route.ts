import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsappMessage } from '@/lib/zapi/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message, clientIds } = await req.json() as { message: string; clientIds: string[] }
  if (!message?.trim() || !clientIds?.length) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const svc = createServiceClient()
  const { data: targets } = await svc
    .from('profiles')
    .select('id, name, whatsapp')
    .in('id', clientIds)
    .eq('role', 'cliente')

  const results = await Promise.allSettled(
    ((targets ?? []) as { id: string; name: string; whatsapp: string | null }[])
      .filter(t => t.whatsapp)
      .map(async t => {
        await sendWhatsappMessage(t.whatsapp!, message)
        await svc.from('whatsapp_logs').insert({ user_id: t.id, phone: t.whatsapp, message, status: 'enviado' })
        return t.id
      })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  return NextResponse.json({ sent, failed })
}
