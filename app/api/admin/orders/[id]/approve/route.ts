import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsappMessage } from '@/lib/zapi/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { viralityGrade, feedback } = await req.json()
  const serviceClient = createServiceClient()

  // Get order with client info
  const { data: order } = await serviceClient
    .from('orders')
    .select(`
      id, client_id,
      profiles!orders_client_id_fkey(name, whatsapp),
      deliverables(id, clip_number)
    `)
    .eq('id', params.id)
    .eq('status', 'aprovacao')
    .single()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const deliverable = order.deliverables?.[0]
  const clientProfile = order.profiles as unknown as { name: string; whatsapp: string }

  // Update deliverable
  await serviceClient
    .from('deliverables')
    .update({ virality_grade: viralityGrade, feedback, approved_at: new Date().toISOString(), approved_by: user.id })
    .eq('order_id', params.id)

  // Update order status
  await serviceClient.from('orders').update({ status: 'entregue' }).eq('id', params.id)

  // Increment clips_delivered on contract
  await serviceClient.rpc('increment_clips_delivered', { p_client_id: order.client_id })

  // Send WhatsApp notification via Z-API
  if (clientProfile?.whatsapp) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const clipLink = `${appUrl}/meus-clipes`
    const message = `🎬 *Seu clipe está pronto!*\n\nO Clipe #${deliverable?.clip_number} foi aprovado pela nossa equipe e está aguardando sua aprovação final.\n\nAcesse a plataforma para assistir, aprovar ou solicitar revisão:\n${clipLink}`

    try {
      await sendWhatsappMessage(clientProfile.whatsapp, message)
      // Log the message
      await serviceClient.from('whatsapp_logs').insert({
        user_id: order.client_id,
        phone: clientProfile.whatsapp,
        message,
        status: 'enviado',
      })
    } catch (err) {
      await serviceClient.from('whatsapp_logs').insert({
        user_id: order.client_id,
        phone: clientProfile.whatsapp,
        message,
        status: 'erro',
        error_details: String(err),
      })
    }
  }

  return NextResponse.json({ ok: true })
}
