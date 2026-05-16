import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsappMessage } from '@/lib/zapi/client'
import { NextRequest, NextResponse } from 'next/server'

async function runReminders() {
  const supabase = createServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const { data: contracts } = await supabase
    .from('client_contracts')
    .select('user_id, clips_total, clips_delivered, profiles(name, whatsapp)')
    .in('status', ['ativo', 'encerrando'])

  if (!contracts?.length) return { ok: true, checked: 0 }

  const results = []

  for (const contract of contracts) {
    const profile = Array.isArray(contract.profiles) ? contract.profiles[0] : contract.profiles
    if (!profile?.whatsapp) continue

    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('client_id', contract.user_id)
      .gte('created_at', todayStr)
      .limit(1)

    if (todayOrders && todayOrders.length > 0) {
      results.push({ whatsapp: profile.whatsapp, sent: false, reason: 'ja_upou_hoje' })
      continue
    }

    const diasAtivos = contract.clips_delivered
    const message =
`Oi ${profile.name}! 👋

Lembrete do dia: você ainda não enviou o vídeo de hoje para edição! 🎬

Acessa a plataforma e sobe o vídeo pra garantir seu clipe diário:
🔗 ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://upfy-clipes.vercel.app'}

Você já tem ${diasAtivos} clipe${diasAtivos !== 1 ? 's' : ''} entregue${diasAtivos !== 1 ? 's' : ''}. Mantém a consistência! 💪`

    try {
      await sendWhatsappMessage(profile.whatsapp, message)
      await supabase.from('whatsapp_logs').insert({
        user_id: contract.user_id,
        phone: profile.whatsapp,
        message,
        status: 'enviado',
      })
      results.push({ whatsapp: profile.whatsapp, sent: true })
    } catch (e) {
      await supabase.from('whatsapp_logs').insert({
        user_id: contract.user_id,
        phone: profile.whatsapp,
        message,
        status: 'erro',
        error_details: String(e),
      })
      results.push({ whatsapp: profile.whatsapp, sent: false, reason: 'erro_zapi' })
    }
  }

  return { ok: true, checked: results.length, results }
}

// Vercel Cron chama GET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runReminders()
  return NextResponse.json(result)
}

// Chamada manual via POST
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runReminders()
  return NextResponse.json(result)
}
