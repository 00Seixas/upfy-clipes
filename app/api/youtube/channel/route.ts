import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveChannelId, fetchChannel, fetchChannelVideos } from '@/lib/youtube/client'

const DEMO_MODE = !process.env.YOUTUBE_API_KEY

/** GET /api/youtube/channel?input=@handle — fetch channel + videos */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const input = req.nextUrl.searchParams.get('input')?.trim()
  if (!input) return NextResponse.json({ error: 'Informe o canal' }, { status: 400 })

  // Demo mode — return mock data
  if (DEMO_MODE) {
    return NextResponse.json({
      channel: {
        id: 'UC_demo',
        title: 'Canal Demo',
        handle: '@canaldemo',
        thumbnail: '',
        subscriberCount: 12400,
        videoCount: 48,
      },
      videos: [
        { id: 'vid1', title: 'Como crescer no YouTube em 2025', description: 'Neste vídeo vou te ensinar tudo...', thumbnail: '', publishedAt: new Date().toISOString(), duration: 'PT18M30S', durationSeconds: 1110, viewCount: 8200, likeCount: 310, url: 'https://youtube.com/watch?v=vid1' },
        { id: 'vid2', title: 'A verdade sobre monetização', description: 'Muita gente não sabe...', thumbnail: '', publishedAt: new Date(Date.now()-86400000*3).toISOString(), duration: 'PT35M10S', durationSeconds: 2110, viewCount: 14500, likeCount: 890, url: 'https://youtube.com/watch?v=vid2' },
        { id: 'vid3', title: 'Errei e vou te contar tudo', description: 'Essa é a história mais honesta...', thumbnail: '', publishedAt: new Date(Date.now()-86400000*7).toISOString(), duration: 'PT12M5S', durationSeconds: 725, viewCount: 32000, likeCount: 2100, url: 'https://youtube.com/watch?v=vid3' },
      ],
      demo: true,
    })
  }

  try {
    const channelId = await resolveChannelId(input)
    const [channel, videos] = await Promise.all([
      fetchChannel(channelId),
      fetchChannelVideos(channelId, 20),
    ])
    return NextResponse.json({ channel, videos })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar canal' },
      { status: 400 }
    )
  }
}

/** POST /api/youtube/channel — save channel handle to profile */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channelId, channelHandle, channelTitle } = await req.json()

  await supabase.from('profiles').update({
    youtube_channel_id:     channelId,
    youtube_channel_handle: channelHandle,
    youtube_channel_title:  channelTitle,
  }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
