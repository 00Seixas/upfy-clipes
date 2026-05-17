const YT_API_KEY = process.env.YOUTUBE_API_KEY ?? ''
const YT_BASE = 'https://www.googleapis.com/youtube/v3'

export type YTVideo = {
  id: string
  title: string
  description: string
  thumbnail: string
  publishedAt: string
  duration: string       // ISO 8601 e.g. PT5M30S
  durationSeconds: number
  viewCount: number
  likeCount: number
  url: string
}

export type YTChannel = {
  id: string
  title: string
  handle: string
  thumbnail: string
  subscriberCount: number
  videoCount: number
}

/** Resolve @handle or channel URL → channel ID */
export async function resolveChannelId(input: string): Promise<string> {
  // Extract handle or ID from various URL formats
  const clean = input.trim()

  // Already a channel ID (UCxxxxxx)
  if (/^UC[\w-]{22}$/.test(clean)) return clean

  // Extract from URL
  let handle = clean
  const patterns = [
    /youtube\.com\/@([\w.-]+)/,
    /youtube\.com\/channel\/(UC[\w-]{22})/,
    /youtube\.com\/c\/([\w.-]+)/,
    /youtube\.com\/user\/([\w.-]+)/,
  ]
  for (const p of patterns) {
    const m = clean.match(p)
    if (m) { handle = m[1]; break }
  }
  // Remove leading @
  handle = handle.replace(/^@/, '')

  // Try forHandle search first
  const res = await fetch(
    `${YT_BASE}/channels?part=id&forHandle=${encodeURIComponent('@' + handle)}&key=${YT_API_KEY}`
  )
  const data = await res.json()
  if (data.items?.[0]?.id) return data.items[0].id

  // Fallback: search API
  const res2 = await fetch(
    `${YT_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1&key=${YT_API_KEY}`
  )
  const data2 = await res2.json()
  const channelId = data2.items?.[0]?.snippet?.channelId
  if (channelId) return channelId

  throw new Error('Canal não encontrado. Verifique o link ou handle.')
}

/** Fetch channel info */
export async function fetchChannel(channelId: string): Promise<YTChannel> {
  const res = await fetch(
    `${YT_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${YT_API_KEY}`
  )
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) throw new Error('Canal não encontrado')
  return {
    id: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl ?? '',
    thumbnail: item.snippet.thumbnails?.default?.url ?? '',
    subscriberCount: parseInt(item.statistics.subscriberCount ?? '0'),
    videoCount: parseInt(item.statistics.videoCount ?? '0'),
  }
}

/** Parse ISO 8601 duration → seconds */
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] ?? '0') * 3600) + (parseInt(m[2] ?? '0') * 60) + parseInt(m[3] ?? '0')
}

/** Format seconds → "5:30" */
export function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

/** Format number → "1.2M" */
export function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1000)}K`
  return String(n)
}

/** Fetch latest videos for a channel (max 50) */
export async function fetchChannelVideos(channelId: string, maxResults = 20): Promise<YTVideo[]> {
  // Step 1: get video IDs from search
  const searchRes = await fetch(
    `${YT_BASE}/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=${maxResults}&key=${YT_API_KEY}`
  )
  const searchData = await searchRes.json()
  const ids: string[] = (searchData.items ?? []).map((i: { id: { videoId: string } }) => i.id.videoId).filter(Boolean)
  if (!ids.length) return []

  // Step 2: get video details (duration, stats)
  const detailRes = await fetch(
    `${YT_BASE}/videos?part=snippet,contentDetails,statistics&id=${ids.join(',')}&key=${YT_API_KEY}`
  )
  const detailData = await detailRes.json()

  return (detailData.items ?? []).map((item: {
    id: string
    snippet: { title: string; description: string; publishedAt: string; thumbnails: { maxres?: { url: string }; high?: { url: string }; default?: { url: string } } }
    contentDetails: { duration: string }
    statistics: { viewCount?: string; likeCount?: string }
  }) => {
    const dur = parseDuration(item.contentDetails.duration)
    return {
      id:              item.id,
      title:           item.snippet.title,
      description:     item.snippet.description.slice(0, 500),
      thumbnail:       item.snippet.thumbnails.maxres?.url ?? item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? '',
      publishedAt:     item.snippet.publishedAt,
      duration:        item.contentDetails.duration,
      durationSeconds: dur,
      viewCount:       parseInt(item.statistics.viewCount ?? '0'),
      likeCount:       parseInt(item.statistics.likeCount ?? '0'),
      url:             `https://youtube.com/watch?v=${item.id}`,
    }
  }).filter((v: YTVideo) => v.durationSeconds >= 60) // skip Shorts < 1 min
}
