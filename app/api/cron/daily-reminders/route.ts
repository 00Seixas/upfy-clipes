import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsappMessage } from '@/lib/zapi/client'
import { NextRequest, NextResponse } from 'next/server'

// Chamado diariamente via Vercel Cron (vercel.json)
// Também pode ser chamado manualmente: POST /api/cron/daily-reminders
export async function POST(req: NextRequest) {
  // Proteção básica por token
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  // Busca todos os clientes com contrato ativo
  const { data: contracts } = await supabase
    .from('client_contracts')
    .select('user_id, clips_total, clips_delivered, profiles(name, whatsapp)')
    .in('status', ['ativo', 'encerrando'])

  if (!contracts?.length) return NextResponse.json({ ok: true, checked: 0 })

  const results = []

  for (const contract of contracts) {
    const profile = Array.isArray(contract.profiles) ? contract.profiles[0] : contract.profiles
    if (!profile?.whatsapp) continue

    // Verifica se o cliente fez upload hoje
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('client_id', contract.user_id)
      .gte('created_at', todayStr)
      .limit(1)

    if (todayOrders && todayOrders.length > 0) {
      // Já upou hoje — não precisa lembrar
      results.push({ whatsapp: profile.whatsapp, sent: false, reason: 'ja_upou_hoje' })
      continue
    }

    // Não upou hoje — manda lembrete
    const diasAtivos = contract.clips_delivered
    const message =
`Oi ${profile.name}! 👋

Lembrete do dia: você ainda não enviou o vídeo de hoje para edição! 🎬

Acessa a plataforma e sobe o vídeo pra garantir seu clipe diário:
🔗 ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://clipes.upfymidia.com'}

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

  return NextResponse.json({ ok: true, checked: results.length, results })
}
