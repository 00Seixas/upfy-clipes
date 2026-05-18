import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { platform } = await req.json() as { platform: string }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('social_connections').delete().eq('user_id', user.id).eq('platform', platform)
  return NextResponse.json({ success: true })
}
