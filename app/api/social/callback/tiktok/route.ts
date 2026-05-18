import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) return NextResponse.redirect(`${appUrl}/meus-clipes?social_error=tiktok`)

  const clientKey = process.env.TIKTOK_CLIENT_KEY ?? ''
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? ''
  const redirectUri = `${appUrl}/api/social/callback/tiktok`

  // Exchange code for token
  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
  })
  const tokenData = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!tokenData.access_token) return NextResponse.redirect(`${appUrl}/meus-clipes?social_error=tiktok`)

  // Get user info
  const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userData = await userRes.json() as { data?: { user?: { open_id?: string; display_name?: string } } }
  const platformUserId = userData.data?.user?.open_id ?? ''
  const platformUsername = userData.data?.user?.display_name ?? ''

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  await supabase.from('social_connections').upsert({
    user_id: user.id,
    platform: 'tiktok',
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    platform_user_id: platformUserId,
    platform_username: platformUsername,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.redirect(`${appUrl}/meus-clipes?social_connected=tiktok`)
}
