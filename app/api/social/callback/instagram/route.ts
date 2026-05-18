import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) return NextResponse.redirect(`${appUrl}/meus-clipes?social_error=instagram`)

  const appId = process.env.INSTAGRAM_APP_ID ?? ''
  const appSecret = process.env.INSTAGRAM_APP_SECRET ?? ''
  const redirectUri = `${appUrl}/api/social/callback/instagram`

  // Exchange code for short-lived token
  const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`)
  const tokenData = await tokenRes.json() as { access_token?: string }
  if (!tokenData.access_token) return NextResponse.redirect(`${appUrl}/meus-clipes?social_error=instagram`)

  // Get long-lived token
  const llRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`)
  const llData = await llRes.json() as { access_token?: string; expires_in?: number }
  const accessToken = llData.access_token ?? tokenData.access_token

  // Get user's Instagram Business Account
  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`)
  const pagesData = await pagesRes.json() as { data?: { id: string }[] }
  const page = pagesData.data?.[0]
  let igUserId = ''
  let igUsername = ''

  if (page) {
    const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`)
    const igData = await igRes.json() as { instagram_business_account?: { id?: string } }
    igUserId = igData.instagram_business_account?.id ?? ''
    if (igUserId) {
      const igInfoRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}?fields=username&access_token=${accessToken}`)
      const igInfoData = await igInfoRes.json() as { username?: string }
      igUsername = igInfoData.username ?? ''
    }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  await supabase.from('social_connections').upsert({
    user_id: user.id,
    platform: 'instagram',
    access_token: accessToken,
    refresh_token: null,
    expires_at: llData.expires_in ? new Date(Date.now() + llData.expires_in * 1000).toISOString() : null,
    platform_user_id: igUserId,
    platform_username: igUsername,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.redirect(`${appUrl}/meus-clipes?social_connected=instagram`)
}
