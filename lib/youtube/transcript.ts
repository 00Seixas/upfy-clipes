export interface TranscriptSegment {
  text: string
  startMs: number
  startFormatted: string // "0:32", "1:45" etc
}

export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
  for (const lang of ['pt', 'pt-BR', 'en']) {
    try {
      const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!res.ok) continue
      const data = await res.json() as { events?: { tStartMs?: number; segs?: { utf8: string }[] }[] }
      if (!data.events?.length) continue

      const segments: TranscriptSegment[] = data.events
        .filter((e) => e.segs)
        .map((e) => {
          const ms = e.tStartMs ?? 0
          const totalSec = Math.floor(ms / 1000)
          const min = Math.floor(totalSec / 60)
          const sec = totalSec % 60
          return {
            text: (e.segs ?? []).map((s) => s.utf8).join('').trim(),
            startMs: ms,
            startFormatted: `${min}:${String(sec).padStart(2, '0')}`,
          }
        })
        .filter((s) => s.text.length > 0)

      if (segments.length > 0) return segments
    } catch { continue }
  }
  return null
}

export function transcriptToText(segments: TranscriptSegment[]): string {
  return segments.map(s => `[${s.startFormatted}] ${s.text}`).join('\n')
}
