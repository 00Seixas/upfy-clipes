import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

export type ClipAnalysis = {
  estimatedClips: number
  viralPotential: 'frio' | 'morno' | 'quente' | 'viral'
  reason: string
  suggestedAngles: string[]
  bestMomentTypes: string[]
  hookSuggestion: string
}

export type VideoAnalysis = ClipAnalysis & {
  clipTimestamps?: { start: string; end: string; reason: string }[]
  transcriptAnalyzed?: boolean
}

/**
 * Uses Claude to analyze a YouTube video and estimate how many clips
 * can be extracted and their viral potential.
 * Optionally accepts a full transcript for timestamp-level clip suggestions.
 */
export async function analyzeVideoForClips(
  video: {
    title: string
    description: string
    durationSeconds: number
    viewCount: number
    likeCount: number
  },
  transcript?: string | null
): Promise<VideoAnalysis> {
  const durationMin = Math.round(video.durationSeconds / 60)
  const engagementRate = video.viewCount > 0
    ? ((video.likeCount / video.viewCount) * 100).toFixed(2)
    : '0'

  // ── Transcript-aware prompt ────────────────────────────────────────────────
  if (transcript) {
    const prompt = `Você é um especialista em viralidade de conteúdo de vídeo curto. Analise esta transcrição e:

1. Avalie o potencial viral geral (frio/morno/quente/viral)
2. Identifique os 3-5 melhores momentos para clipar com timestamps
3. Para cada clipe sugerido, explique o motivo (hook, surpresa, emoção, etc.)

Critérios de viralidade que uso:
- Hook forte nos primeiros 3s (faz o viewer parar o scroll)
- Fator surpresa (info inesperada, posição contrária, dado chocante)
- Ressonância emocional (luta, vitória, transformação)
- Citabilidade (algo que alguém compartilharia como screenshot)
- Autonomia do segmento (faz sentido sem contexto)

Metadados do vídeo:
Título: ${video.title}
Duração: ${durationMin} minutos
Views: ${video.viewCount.toLocaleString()}
Likes: ${video.likeCount.toLocaleString()}
Engajamento: ${engagementRate}%

Transcrição:
${transcript.slice(0, 8000)}

Responda APENAS com um JSON válido neste formato exato:
{
  "estimatedClips": <número inteiro de 1 a 15>,
  "viralPotential": "frio"|"morno"|"quente"|"viral",
  "reason": "<análise em 1-2 frases>",
  "suggestedAngles": ["<ângulo 1>", "<ângulo 2>", "<ângulo 3>"],
  "bestMomentTypes": ["<tipo 1>", "<tipo 2>"],
  "hookSuggestion": "<sugestão de hook de abertura para o clipe mais forte>",
  "clipTimestamps": [
    { "start": "0:32", "end": "1:15", "reason": "Hook forte + dado surpreendente" }
  ],
  "transcriptAnalyzed": true
}`

    try {
      const message = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = (message.content[0] as { text: string }).text.trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')

      const result = JSON.parse(jsonMatch[0]) as VideoAnalysis
      if (!result.estimatedClips || !result.viralPotential) throw new Error('Invalid response')
      return result
    } catch {
      // Fall through to metadata-only analysis
    }
  }

  // ── Metadata-only prompt ───────────────────────────────────────────────────
  const prompt = `Você é um especialista em criação de conteúdo para redes sociais e corte de vídeos longos em clipes virais.

Analise este vídeo do YouTube e estime o potencial de clipes:

TÍTULO: ${video.title}
DESCRIÇÃO: ${video.description.slice(0, 300)}
DURAÇÃO: ${durationMin} minutos
VISUALIZAÇÕES: ${video.viewCount.toLocaleString()}
LIKES: ${video.likeCount.toLocaleString()}
TAXA DE ENGAJAMENTO: ${engagementRate}%

Responda APENAS com um JSON válido neste formato exato:
{
  "estimatedClips": <número inteiro de 1 a 15>,
  "viralPotential": <"frio" | "morno" | "quente" | "viral">,
  "reason": "<motivo em 1 frase curta>",
  "suggestedAngles": ["<ângulo 1>", "<ângulo 2>", "<ângulo 3>"],
  "bestMomentTypes": ["<tipo 1>", "<tipo 2>"],
  "hookSuggestion": "<sugestão de hook de abertura para o clipe mais forte>"
}

Critérios para estimatedClips:
- Vídeo curto (< 10min): 1-3 clipes
- Vídeo médio (10-30min): 3-6 clipes
- Vídeo longo (30-60min): 5-10 clipes
- Vídeo muito longo (60min+): 8-15 clipes

Critérios para viralPotential:
- frio: conteúdo técnico/nicho, pouco engajamento
- morno: conteúdo educativo, engajamento médio
- quente: história, polêmica, tutorial prático, alto engajamento
- viral: emoção forte, revelação, polêmica, story impactante, engajamento alto`

  try {
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (message.content[0] as { text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const result = JSON.parse(jsonMatch[0]) as VideoAnalysis
    if (!result.estimatedClips || !result.viralPotential) throw new Error('Invalid response')
    return result
  } catch {
    // Fallback heuristic if Claude fails
    const clips = Math.max(1, Math.min(12, Math.floor(video.durationSeconds / 300)))
    const vp = video.likeCount / Math.max(1, video.viewCount)
    return {
      estimatedClips: clips,
      viralPotential: vp > 0.05 ? 'quente' : vp > 0.02 ? 'morno' : 'frio',
      reason: 'Estimativa baseada na duração e engajamento do vídeo.',
      suggestedAngles: ['Trecho mais informativo', 'Momento de maior impacto', 'Conclusão ou insight principal'],
      bestMomentTypes: ['Educativo', 'Storytelling'],
      hookSuggestion: 'Comece com a parte mais surpreendente do vídeo.',
    }
  }
}

// Keep backward-compat export alias
export { analyzeVideoForClips as analyzeVideo }
