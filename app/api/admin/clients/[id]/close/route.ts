import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsappMessage } from '@/lib/zapi/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Busca dados do cliente
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('name, whatsapp')
    .eq('id', params.id)
    .single()

  // Encerra contrato
  await serviceClient.from('client_contracts').update({ status: 'encerrado' }).eq('user_id', params.id)

  // Envia mensagem de encerramento via WhatsApp
  if (profile?.whatsapp) {
    const message =
`Olá ${profile.name}! 👋

Seu contrato com a UPFY Mídia foi encerrado.

Foi um prazer trabalhar com você! Todos os seus clipes continuam disponíveis na plataforma para download.

Quando quiser retomar, é só chamar. 🚀`

    try {
      await sendWhatsappMessage(profile.whatsapp, message)
      await serviceClient.from('whatsapp_logs').insert({
        user_id: params.id,
        phone: profile.whatsapp,
        message,
        status: 'enviado',
      })
    } catch {
      await serviceClient.from('whatsapp_logs').insert({
        user_id: params.id,
        phone: profile.whatsapp,
        message,
        status: 'erro',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
