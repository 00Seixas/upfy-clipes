import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsappMessage } from '@/lib/zapi/client'
import { NextRequest, NextResponse } from 'next/server'

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET() {
  const supabase = createServiceClient()
  const { data: clients } = await supabase
    .from('profiles')
    .select(`
      id, name, whatsapp, created_at,
      client_contracts(id, clips_total, clips_delivered, start_date, end_date, status, payment_link, notes)
    `)
    .eq('role', 'cliente')
    .order('created_at', { ascending: false })
  return NextResponse.json({ clients: clients ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { name, whatsapp, password: customPassword, clipsTotal, daysTotal, paymentLink, notes } = await req.json()

  const password = customPassword || generatePassword()
  const email = `${whatsapp.replace(/\D/g, '')}@clientes.upfy.internal`

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role: 'cliente' },
    email_confirm: true,
  })

  if (authError || !authData.user) {
    console.error('Erro ao criar usuário:', authError)
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar usuário' }, { status: 400 })
  }

  // Update profile with whatsapp
  await supabase.from('profiles').update({ whatsapp: whatsapp.replace(/\D/g, ''), name }).eq('id', authData.user.id)

  // Create contract
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + (daysTotal ?? 30))

  await supabase.from('client_contracts').insert({
    user_id: authData.user.id,
    clips_total: clipsTotal ?? 30,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    payment_link: paymentLink,
    notes,
    status: 'ativo',
  })

  // Enviar boas-vindas automático via WhatsApp
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clipes.upfymidia.com'
  const welcomeMessage =
`Olá ${name}! Seja bem-vindo à UPFY Mídia 🎬

Você contratou ${clipsTotal ?? 30} clipes que serão entregues ao longo de ${daysTotal ?? 30} dias.

Acessa sua plataforma:
🔗 ${appUrl}
📱 Login: ${whatsapp.replace(/\D/g, '')}
🔑 Senha: ${password}

Upa os vídeos que quer transformar em clipes. Qualquer dúvida é só chamar. Bora crescer! 🚀`

  let whatsappSent = false
  try {
    await sendWhatsappMessage(whatsapp.replace(/\D/g, ''), welcomeMessage)
    await supabase.from('whatsapp_logs').insert({
      user_id: authData.user.id,
      phone: whatsapp.replace(/\D/g, ''),
      message: welcomeMessage,
      status: 'enviado',
    })
    whatsappSent = true
  } catch (e) {
    await supabase.from('whatsapp_logs').insert({
      user_id: authData.user.id,
      phone: whatsapp.replace(/\D/g, ''),
      message: welcomeMessage,
      status: 'erro',
      error_details: String(e),
    })
  }

  return NextResponse.json({
    ok: true,
    user: { id: authData.user.id, name, whatsapp: whatsapp.replace(/\D/g, '') },
    password,
    email,
    whatsappSent,
  })
}
