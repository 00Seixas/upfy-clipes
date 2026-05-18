import { NextResponse } from 'next/server'
export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID ?? ''
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback/instagram`)
  const scope = 'instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list'
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`
  return NextResponse.redirect(url)
}
