import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsappMessage } from '@/lib/zapi/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()

  const { data: profile } = await serviceClient.from('profiles').select('whatsapp, name').eq('id', params.id).single()
  if (!profile?.whatsapp) return NextResponse.json({ error: 'WhatsApp não encontrado' }, { status: 400 })

  try {
    await sendWhatsappMessage(profile.whatsapp, message)
    await serviceClient.from('whatsapp_logs').insert({
      user_id: params.id,
      phone: profile.whatsapp,
      message,
      status: 'enviado',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    await serviceClient.from('whatsapp_logs').insert({
      user_id: params.id,
      phone: profile.whatsapp,
      message,
      status: 'erro',
      error_details: String(err),
    })
    return NextResponse.json({ error: 'Falha ao enviar mensagem' }, { status: 500 })
  }
}
