import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get followup templates
  const { data: templates } = await serviceClient.from('followup_templates').select('*').order('day_number')
  if (!templates?.length) return NextResponse.json({ error: 'No templates found' }, { status: 400 })

  // Get client info for message interpolation
  const { data: profile } = await serviceClient.from('profiles').select('name').eq('id', params.id).single()
  const { data: contract } = await serviceClient.from('client_contracts').select('payment_link').eq('user_id', params.id).single()

  const now = new Date()
  const sequences = templates.map((t: { day_number: number; message: string }) => ({
    user_id: params.id,
    day_number: t.day_number,
    message: t.message
      .replace(/{nome}/g, profile?.name ?? 'cliente')
      .replace(/{link}/g, contract?.payment_link ?? ''),
    scheduled_at: new Date(now.getTime() + t.day_number * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pendente',
  }))

  await serviceClient.from('followup_sequences').insert(sequences)

  return NextResponse.json({ ok: true })
}
