import { NextResponse } from 'next/server'
export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY ?? ''
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback/tiktok`)
  const scope = 'video.upload,video.publish,user.info.basic'
  const state = Math.random().toString(36).slice(2)
  const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=${state}`
  return NextResponse.redirect(url)
}
