import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requestPayout, fetchPayouts } from '@/lib/services/editor-wallet'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['editor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payouts = await fetchPayouts({ editorId: user.id })
  return NextResponse.json({ payouts })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['editor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { amountCents, pixKey, pixKeyType } = await req.json() as {
    amountCents: number
    pixKey:      string
    pixKeyType:  string
  }

  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
  }
  if (!pixKey?.trim()) {
    return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 })
  }
  const validTypes = ['cpf', 'cnpj', 'email', 'phone', 'random']
  if (!validTypes.includes(pixKeyType)) {
    return NextResponse.json({ error: 'Tipo de chave PIX inválido' }, { status: 400 })
  }

  try {
    const payout = await requestPayout({
      editorId:    user.id,
      amountCents,
      pixKey:      pixKey.trim(),
      pixKeyType,
    })
    return NextResponse.json({ ok: true, payout })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao solicitar saque'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
