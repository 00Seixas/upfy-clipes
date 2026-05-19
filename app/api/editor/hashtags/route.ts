import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ presets: [] }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('hashtag_presets')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ presets: (data?.hashtag_presets as string[]) ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { presets } = await req.json() as { presets: string[] }
  if (!Array.isArray(presets)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  await supabase.from('profiles').update({ hashtag_presets: presets }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
