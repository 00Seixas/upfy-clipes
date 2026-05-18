import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ tiktok: false, instagram: false })

  const { data } = await supabase.from('social_connections').select('platform, platform_username').eq('user_id', user.id)
  const connections = data ?? []
  const tiktok    = connections.find(c => c.platform === 'tiktok')
  const instagram = connections.find(c => c.platform === 'instagram')

  return NextResponse.json({
    tiktok:    tiktok    ? { connected: true,  username: tiktok.platform_username    } : { connected: false },
    instagram: instagram ? { connected: true,  username: instagram.platform_username } : { connected: false },
  })
}
