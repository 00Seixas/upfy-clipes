import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeVideoForClips } from '@/lib/claude/analyzer'
import { fetchTranscript, transcriptToText } from '@/lib/youtube/transcript'

const DEMO_MODE = !process.env.ANTHROPIC_API_KEY

/** POST /api/youtube/analyze — analyze a YouTube video with Claude */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, durationSeconds, viewCount, likeCount, videoId } = await req.json()

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  // Demo mode — return mock analysis
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, 1200)) // simulate API delay
    const clips = Math.max(1, Math.min(10, Math.floor((durationSeconds ?? 600) / 240)))
    const vp = (likeCount ?? 0) / Math.max(1, viewCount ?? 1)
    return NextResponse.json({
      estimatedClips: clips,
      viralPotential: vp > 0.05 ? 'viral' : vp > 0.02 ? 'quente' : 'morno',
      reason: 'Conteúdo com bom potencial baseado na duração e engajamento.',
      suggestedAngles: ['Momento mais impactante', 'Revelação principal', 'Dica prática'],
      bestMomentTypes: ['Storytelling', 'Educativo'],
      hookSuggestion: 'Abra com a parte mais surpreendente do vídeo.',
      demo: true,
    })
  }

  try {
    // Attempt to fetch transcript when a videoId is provided
    let transcriptText: string | null = null
    if (videoId) {
      const segments = await fetchTranscript(videoId as string)
      if (segments) {
        transcriptText = transcriptToText(segments)
      }
    }

    const analysis = await analyzeVideoForClips(
      { title, description, durationSeconds, viewCount, likeCount },
      transcriptText
    )

    return NextResponse.json(analysis)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro na análise' },
      { status: 500 }
    )
  }
}
