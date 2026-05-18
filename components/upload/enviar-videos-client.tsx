'use client'
import { useState, useCallback } from 'react'
import { Upload, X, Film, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ContentTone, CTA, Briefing, TargetPlatform } from '@/types'

interface VideoItem {
  id: string
  file: File
  preview: string
  briefing: Briefing
}

const defaultBriefing: Briefing = {
  tone: 'educativo',
  music: '',
  cta: 'nenhum',
  editingStyle: '',
  notes: '',
  openingHook: '',
  platforms: [],
}

const HOOK_EXAMPLES = [
  'Isso vai mudar como você pensa sobre [tema]',
  'A maioria das pessoas faz isso errado',
  'Ninguém fala sobre isso, mas deveria',
  'Eu perdi [X] por não saber disso antes',
]

function getRandomHooks(): string[] {
  const shuffled = [...HOOK_EXAMPLES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 4)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Hook Suggestion Section ─────────────────────────────────────────────────

interface HookSuggestionProps {
  videoId: string
  currentHook: string
  onSelect: (hook: string) => void
}

function HookSuggestion({ videoId: _videoId, currentHook: _currentHook, onSelect }: HookSuggestionProps) {
  const [open, setOpen] = useState(false)
  const [hooks] = useState<string[]>(getRandomHooks)

  return (
    <div className="col-span-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        💡 Precisa de inspiração?
      </button>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hooks.map(hook => (
            <button
              key={hook}
              type="button"
              onClick={() => onSelect(hook)}
              className="text-left text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 border border-white/[0.06] hover:border-white/[0.12] rounded-lg px-3 py-2 transition-all leading-relaxed"
            >
              {hook}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EnviarVideosClient() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [sameForAll, setSameForAll] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return
    const newVideos: VideoItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      briefing: { ...defaultBriefing, platforms: [] },
    }))
    setVideos(prev => [...prev, ...newVideos])
  }, [])

  const removeVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id))
  }

  const updateBriefing = (id: string, field: keyof Briefing, value: Briefing[keyof Briefing]) => {
    setVideos(prev => prev.map(v => {
      if (sameForAll) {
        return { ...v, briefing: { ...v.briefing, [field]: value } }
      }
      if (v.id === id) return { ...v, briefing: { ...v.briefing, [field]: value } }
      return v
    }))
  }

  const togglePlatform = (id: string, platform: TargetPlatform) => {
    setVideos(prev => prev.map(v => {
      const target = sameForAll ? true : v.id === id
      if (!target) return v
      const current = v.briefing.platforms ?? []
      const next = current.includes(platform)
        ? current.filter(p => p !== platform)
        : [...current, platform]
      return { ...v, briefing: { ...v.briefing, platforms: next } }
    }))
  }

  async function handleSubmit() {
    if (videos.length === 0) return
    setUploading(true)

    try {
      const prepared = []
      for (const video of videos) {
        console.log('[upload] pedindo presigned URL para', video.file.name)

        // 1. Pede presigned URL ao servidor
        const res = await fetch('/api/upload/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: video.file.name,
            contentType: video.file.type || 'video/mp4',
          }),
        })
        const text = await res.text()
        let json: { signedUrl?: string; key?: string; error?: string }
        try { json = JSON.parse(text) } catch { throw new Error('Servidor retornou: ' + text.slice(0, 300)) }
        if (!res.ok || json.error || !json.signedUrl) throw new Error(json.error ?? 'Sem URL de upload')

        console.log('[upload] PUT direto no R2...')

        // 2. Upload direto do browser pro R2 via XHR (mais compatível com Safari)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', json.signedUrl as string, true)
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`R2 erro ${xhr.status}: ${xhr.responseText}`))
          }
          xhr.onerror = () => reject(new Error('Falha na conexão com o R2'))
          xhr.ontimeout = () => reject(new Error('Timeout no upload'))
          xhr.send(video.file)
        })

        const { key } = json
        console.log('[upload] ok:', key)

        prepared.push({
          filename: video.file.name,
          r2Key: key,
          contentType: video.file.type,
          size: video.file.size,
          briefing: video.briefing,
        })
      }

      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: prepared }),
      })

      setUploading(false)
      setDone(true)
      setVideos([])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[upload] ERRO:', message)
      alert('Erro no upload: ' + message)
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Film className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Vídeos enviados!</h2>
        <p className="text-zinc-400 text-sm mb-6">Seus pedidos entraram na fila de produção.</p>
        <Button onClick={() => setDone(false)} variant="outline" className="border-zinc-700 text-zinc-300">
          Enviar mais vídeos
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <label className="border-2 border-dashed border-zinc-800 rounded-xl p-10 flex flex-col items-center cursor-pointer hover:border-zinc-600 transition-colors block">
        <Upload className="w-8 h-8 text-zinc-600 mb-3" />
        <p className="text-white font-medium text-sm mb-1">Selecionar vídeos</p>
        <p className="text-zinc-500 text-xs">MP4, MOV, AVI • até 2GB por arquivo</p>
        <input
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={e => handleFileSelect(e.target.files)}
        />
      </label>

      {videos.length > 0 && (
        <>
          {/* Same briefing toggle */}
          <div className="flex items-center gap-3 p-4 bg-[#111113] border border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setSameForAll(!sameForAll)}
              className={`relative w-10 h-5 rounded-full transition-colors ${sameForAll ? 'bg-white' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${sameForAll ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-zinc-300">Usar o mesmo briefing pra todos</span>
          </div>

          {/* Video cards */}
          <div className="space-y-4">
            {videos.map((video, index) => (
              <div key={video.id} className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-32 h-20 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0">
                    <video src={video.preview} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{video.file.name}</p>
                    <p className="text-zinc-500 text-xs mt-1">{formatBytes(video.file.size)}</p>
                    {sameForAll && index > 0 && (
                      <p className="text-xs text-zinc-600 mt-2">Usando briefing do primeiro vídeo</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeVideo(video.id)}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(!sameForAll || index === 0) && (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Plataformas alvo */}
                    <div className="col-span-2 space-y-2">
                      <Label className="text-zinc-400 text-xs">Plataformas alvo</Label>
                      <div className="flex gap-3">
                        {(['tiktok', 'instagram'] as TargetPlatform[]).map(platform => {
                          const active = (video.briefing.platforms ?? []).includes(platform)
                          return (
                            <button
                              key={platform}
                              type="button"
                              onClick={() => togglePlatform(video.id, platform)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                                active
                                  ? 'bg-white text-black border-white'
                                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                              }`}
                            >
                              <span>{platform === 'tiktok' ? '🎵' : '📷'}</span>
                              {platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Tom */}
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Tom do conteúdo</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['engraçado', 'educativo', 'inspiracional', 'polêmico'] as ContentTone[]).map(tone => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => updateBriefing(video.id, 'tone', tone)}
                            className={`px-2 py-1.5 rounded text-xs capitalize transition-colors ${
                              video.briefing.tone === tone
                                ? 'bg-white text-black font-medium'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">CTA</Label>
                      <div className="space-y-1.5">
                        {[
                          { value: 'segue_la', label: 'Segue lá' },
                          { value: 'link_na_bio', label: 'Link na bio' },
                          { value: 'nenhum', label: 'Nenhum' },
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateBriefing(video.id, 'cta', value as CTA)}
                            className={`w-full px-2 py-1.5 rounded text-xs text-left transition-colors ${
                              video.briefing.cta === value
                                ? 'bg-white text-black font-medium'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Music */}
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Música preferida</Label>
                      <Input
                        value={video.briefing.music ?? ''}
                        onChange={e => updateBriefing(video.id, 'music', e.target.value)}
                        placeholder="Nome da música (opcional)"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm h-8"
                      />
                    </div>

                    {/* Style */}
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Estilo de edição</Label>
                      <Input
                        value={video.briefing.editingStyle ?? ''}
                        onChange={e => updateBriefing(video.id, 'editingStyle', e.target.value)}
                        placeholder="Ex: dinâmico, cinematográfico..."
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm h-8"
                      />
                    </div>

                    {/* Hook de abertura */}
                    <div className="col-span-2 space-y-2">
                      <Label className="text-zinc-400 text-xs">Gancho de abertura (primeiros 3s)</Label>
                      <Input
                        value={video.briefing.openingHook ?? ''}
                        onChange={e => updateBriefing(video.id, 'openingHook', e.target.value)}
                        placeholder="Ex: Isso vai mudar como você pensa sobre..."
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm h-8"
                      />
                    </div>

                    {/* Hook suggestions */}
                    <HookSuggestion
                      videoId={video.id}
                      currentHook={video.briefing.openingHook ?? ''}
                      onSelect={hook => updateBriefing(video.id, 'openingHook', hook)}
                    />

                    {/* Notes */}
                    <div className="col-span-2 space-y-2">
                      <Label className="text-zinc-400 text-xs">Observações extras</Label>
                      <textarea
                        value={video.briefing.notes ?? ''}
                        onChange={e => updateBriefing(video.id, 'notes', e.target.value)}
                        placeholder="Qualquer detalhe adicional para o editor..."
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 text-sm rounded-md px-3 py-2 resize-none focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-white text-black hover:bg-zinc-100 font-medium"
          >
            {uploading ? 'Enviando...' : `Enviar ${videos.length} vídeo${videos.length > 1 ? 's' : ''} para produção`}
          </Button>
        </>
      )}
    </div>
  )
}
