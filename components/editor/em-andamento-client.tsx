'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload, Film, RotateCcw, ArrowRight, Hash, Plus, X } from 'lucide-react'
import Link from 'next/link'

type ViralityGrade = 'frio' | 'morno' | 'quente' | 'viral'

interface ViralityOption {
  value: ViralityGrade
  label: string
  views: string
  selectedBg: string
  selectedBorder: string
  selectedText: string
}

const VIRALITY_OPTIONS: ViralityOption[] = [
  {
    value: 'frio',
    label: 'FRIO',
    views: '~25K views',
    selectedBg: 'bg-blue-500/[0.06]',
    selectedBorder: 'border-blue-500/30',
    selectedText: 'text-blue-400',
  },
  {
    value: 'morno',
    label: 'MORNO',
    views: '~150K views',
    selectedBg: 'bg-amber-500/[0.06]',
    selectedBorder: 'border-amber-500/30',
    selectedText: 'text-amber-400',
  },
  {
    value: 'quente',
    label: 'QUENTE',
    views: '~600K views',
    selectedBg: 'bg-red-500/[0.06]',
    selectedBorder: 'border-red-500/30',
    selectedText: 'text-red-400',
  },
  {
    value: 'viral',
    label: 'VIRAL',
    views: '~2M views',
    selectedBg: 'bg-purple-500/[0.06]',
    selectedBorder: 'border-purple-500/30',
    selectedText: 'text-purple-400',
  },
]

const CHECKLIST_ITEMS = [
  'Gancho forte nos primeiros 3 segundos',
  'Legenda/CC ativa no clipe',
  'Ritmo dinâmico (sem pausas longas)',
  'CTA presente conforme briefing',
  'Formato vertical 9:16',
]

const CTA_LABELS: Record<string, string> = {
  segue_la:    'Segue lá',
  link_na_bio: 'Link na bio',
  nenhum:      'Nenhum',
}

const TONE_LABELS: Record<string, string> = {
  'engraçado':   'Engraçado',
  educativo:     'Educativo',
  inspiracional: 'Inspiracional',
  'polêmico':    'Polêmico',
}

interface Order {
  id: string
  briefing: Record<string, string>
  created_at: string
  updated_at?: string
  deadline?: string
  profiles: { name: string; whatsapp: string } | null
  videos: { id: string; r2_key: string; filename: string; size_bytes?: number }[]
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function fmtBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${Math.round(bytes / 1_000)} KB`
}

export default function EmAndamentoClient({
  order,
  editorId: _editorId,
  revisionNotes,
}: {
  order: Order | null
  editorId: string
  revisionNotes?: string | null
}) {
  const [viralityGrade, setViralityGrade] = useState<ViralityGrade>('morno')
  const [feedback, setFeedback] = useState('')
  const [socialCaption, setSocialCaption] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [savedHashtags, setSavedHashtags] = useState<string[]>([])
  const [clipFile, setClipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [checklist, setChecklist] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false))
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // Load saved hashtags
  useEffect(() => {
    fetch('/api/editor/hashtags')
      .then(r => r.json())
      .then(({ presets }: { presets: string[] }) => setSavedHashtags(presets ?? []))
      .catch(() => {})
  }, [])

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/\s+/g, '_')
    if (!tag) return
    const formatted = tag.startsWith('#') ? tag : `#${tag}`
    if (savedHashtags.includes(formatted)) { setHashtagInput(''); return }
    const updated = [...savedHashtags, formatted]
    setSavedHashtags(updated)
    setHashtagInput('')
    fetch('/api/editor/hashtags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presets: updated }),
    })
  }

  function removeHashtag(tag: string) {
    const updated = savedHashtags.filter(h => h !== tag)
    setSavedHashtags(updated)
    fetch('/api/editor/hashtags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presets: updated }),
    })
  }

  function appendHashtagToCaption(tag: string) {
    setSocialCaption(prev => prev ? `${prev} ${tag}` : tag)
  }

  // Work timer
  useEffect(() => {
    if (!order) return
    const start = new Date(order.updated_at ?? order.created_at).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [order])

  if (!order) {
    return (
      <div className="text-center py-24">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
          <Film className="w-5 h-5 text-zinc-700" />
        </div>
        <p className="text-zinc-400 text-sm font-medium mb-1">Nenhum pedido em andamento.</p>
        <p className="text-zinc-600 text-xs mb-5">Pegue um job na fila para começar.</p>
        <Link
          href="/fila"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 border border-white/[0.08] hover:border-white/[0.15] px-4 py-2 rounded-xl transition-all"
        >
          Ver Fila <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  const briefing = order.briefing ?? {}
  const video = order.videos?.[0]
  const checklistComplete = checklist.every(Boolean)

  async function handleSubmit() {
    if (!order) return
    if (!clipFile) { setError('Selecione o clipe finalizado.'); return }
    if (!feedback.trim()) { setError('Preencha o feedback antes de enviar.'); return }
    if (!checklistComplete) { setError('Complete o checklist de qualidade.'); return }
    setUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      // 1. Pede presigned URL ao servidor
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: clipFile.name, contentType: clipFile.type, size: clipFile.size }),
      })
      const { signedUrl, key } = await initRes.json() as { signedUrl: string; key: string }
      if (!signedUrl) throw new Error('Erro ao gerar URL de upload')

      // 2. Upload direto pro R2 via XHR com progresso
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl, true)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`R2 erro ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Falha na conexão com R2'))
        xhr.ontimeout = () => reject(new Error('Timeout no upload'))
        xhr.send(clipFile)
      })

      // 3. Submete para aprovação
      const submitRes = await fetch(`/api/orders/${order.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Key: key, filename: clipFile.name, viralityGrade, feedback, socialCaption: socialCaption.trim() || null }),
      })
      if (!submitRes.ok) throw new Error('Erro ao submeter pedido')

      router.push('/entregues')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar. Tente novamente.')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Revision notes banner */}
      {revisionNotes && (
        <div className="bg-amber-500/[0.04] border border-amber-500/20 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-amber-500/60 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600 mb-1.5">
                🔄 REVISÃO SOLICITADA
              </p>
              <p className="text-zinc-300 text-sm leading-relaxed">"{revisionNotes}"</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── LEFT PANEL ── */}
        <div className="space-y-4">
          {/* Briefing */}
          <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-3">
              Briefing do Cliente
            </p>
            <h2 className="text-white font-bold text-lg mb-4">{order.profiles?.name}</h2>

            {/* Work timer */}
            <p className="text-zinc-600 text-xs font-mono mb-4">
              ⏱ Em edição há &nbsp;{formatDuration(elapsed)}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-0.5">Tom</p>
                <p className="text-zinc-300 text-sm">{TONE_LABELS[briefing.tone] ?? briefing.tone ?? '—'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-0.5">CTA</p>
                <p className="text-zinc-300 text-sm">{CTA_LABELS[briefing.cta] ?? briefing.cta ?? '—'}</p>
              </div>
              {briefing.platforms && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-0.5">Plataformas</p>
                  <p className="text-zinc-300 text-sm">{briefing.platforms}</p>
                </div>
              )}
              {briefing.music && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-0.5">Música</p>
                  <p className="text-zinc-300 text-sm">{briefing.music}</p>
                </div>
              )}
              {briefing.editingStyle && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-0.5">Estilo</p>
                  <p className="text-zinc-300 text-sm">{briefing.editingStyle}</p>
                </div>
              )}
              {briefing.notes && (
                <div className="col-span-2">
                  <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-0.5">Notas</p>
                  <p className="text-zinc-300 text-sm">{briefing.notes}</p>
                </div>
              )}
            </div>

            {/* Opening hook */}
            {briefing.openingHook && (
              <div className="mt-4 border-l-2 border-amber-500/40 pl-3">
                <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1">
                  Gancho de Abertura
                </p>
                <p className="text-zinc-300 text-sm italic">"{briefing.openingHook}"</p>
              </div>
            )}
          </div>

          {/* Raw video download */}
          {video && (
            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-3">Vídeo Bruto</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-300 text-xs font-medium truncate">{video.filename}</p>
                  {video.size_bytes && (
                    <p className="text-zinc-700 text-[10px]">{fmtBytes(video.size_bytes)}</p>
                  )}
                </div>
                <a
                  href={`/api/videos/${video.id}/download`}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-white/[0.08] hover:border-white/[0.15] px-3 py-1.5 rounded-lg transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-4">
          {/* Virality grade selector */}
          <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-3">
              Grau de Viralização
            </p>
            <div className="grid grid-cols-2 gap-2">
              {VIRALITY_OPTIONS.map(opt => {
                const selected = viralityGrade === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setViralityGrade(opt.value)}
                    className={`rounded-xl px-4 py-5 border cursor-pointer transition-all text-left ${
                      selected
                        ? `${opt.selectedBg} ${opt.selectedBorder}`
                        : 'bg-[#080809] border-white/[0.06] hover:border-white/[0.1]'
                    }`}
                  >
                    <p className={`text-sm font-black tracking-tight mb-1 ${selected ? opt.selectedText : 'text-zinc-600'}`}>
                      {opt.label}
                    </p>
                    <p className={`text-[10px] font-mono ${selected ? opt.selectedText : 'text-zinc-700'}`}>
                      {opt.views}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-3">
              Feedback do Especialista *
            </p>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Descreva os pontos fortes do conteúdo e o potencial de viralização..."
              rows={4}
              className="w-full bg-white/[0.02] border border-white/[0.06] text-white placeholder:text-zinc-700 text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-white/[0.12] transition-colors"
            />
          </div>

          {/* Caption + Hashtags */}
          <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5 space-y-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-3 flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Legenda para Redes Sociais
              </p>
              <textarea
                value={socialCaption}
                onChange={e => setSocialCaption(e.target.value)}
                placeholder="Escreva a legenda que o cliente vai usar ao postar nas redes..."
                rows={3}
                className="w-full bg-white/[0.02] border border-white/[0.06] text-white placeholder:text-zinc-700 text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-white/[0.12] transition-colors"
              />
            </div>

            {/* Saved hashtags */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-2">
                Suas Hashtags Salvas
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {savedHashtags.map(tag => (
                  <div key={tag} className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-full pl-2.5 pr-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => appendHashtagToCaption(tag)}
                      className="text-zinc-400 hover:text-white text-xs transition-colors"
                    >
                      {tag}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHashtag(tag)}
                      className="text-zinc-700 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {savedHashtags.length === 0 && (
                  <p className="text-zinc-700 text-xs">Nenhuma hashtag salva ainda</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={hashtagInput}
                  onChange={e => setHashtagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag() } }}
                  placeholder="#motivacao"
                  className="flex-1 bg-white/[0.02] border border-white/[0.06] text-zinc-300 placeholder:text-zinc-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-white/[0.12] transition-colors"
                />
                <button
                  type="button"
                  onClick={addHashtag}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] text-zinc-400 hover:text-white text-xs transition-colors"
                >
                  <Plus className="w-3 h-3" /> Salvar
                </button>
              </div>
            </div>
          </div>

          {/* Upload */}
          <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-3">
              Clipe Finalizado
            </p>
            <label className="border border-dashed border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 flex flex-col items-center cursor-pointer transition-colors block">
              <Upload className="w-5 h-5 text-zinc-700 mb-2" />
              <p className="text-zinc-400 text-sm font-medium text-center">
                {clipFile ? clipFile.name : 'Selecionar clipe finalizado'}
              </p>
              <p className="text-zinc-700 text-xs mt-1">MP4, MOV, AVI</p>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => setClipFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {/* Upload progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-zinc-500 text-xs">Enviando clipe...</p>
                  <p className="text-zinc-400 text-xs font-mono">{uploadProgress}%</p>
                </div>
                <div className="bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-white rounded-full h-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quality checklist */}
          <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-3">
              Checklist de Qualidade
            </p>
            <div className="space-y-2.5">
              {CHECKLIST_ITEMS.map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      checklist[i]
                        ? 'bg-white border-white'
                        : 'bg-transparent border-white/[0.1] group-hover:border-white/[0.2]'
                    }`}
                    onClick={() => setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v))}
                  >
                    {checklist[i] && (
                      <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm transition-colors ${checklist[i] ? 'text-zinc-400 line-through' : 'text-zinc-500'}`}>
                    {item}
                  </span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checklist[i]}
                    onChange={() => setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v))}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/[0.04] border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uploading || !checklistComplete}
            className={`w-full bg-white hover:bg-zinc-100 text-black font-bold py-3 rounded-xl transition-colors text-sm ${
              uploading || !checklistComplete ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? 'Enviando...' : 'Enviar para aprovação do admin'}
          </button>
        </div>
      </div>
    </div>
  )
}
