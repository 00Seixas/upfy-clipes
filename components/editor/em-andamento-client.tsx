'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload, Film, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type ViralityGrade = 'frio' | 'morno' | 'quente' | 'viral'

const VIRALITY_OPTIONS: { value: ViralityGrade; label: string; color: string; bg: string }[] = [
  { value: 'frio', label: 'Frio', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { value: 'morno', label: 'Morno', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { value: 'quente', label: 'Quente', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { value: 'viral', label: 'Viral 🔥', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
]

const CTA_LABELS: Record<string, string> = {
  segue_la: 'Segue lá',
  link_na_bio: 'Link na bio',
  nenhum: 'Nenhum',
}

const TONE_LABELS: Record<string, string> = {
  'engraçado': 'Engraçado',
  educativo: 'Educativo',
  inspiracional: 'Inspiracional',
  'polêmico': 'Polêmico',
}

interface Order {
  id: string
  briefing: Record<string, string>
  created_at: string
  deadline?: string
  profiles: { name: string; whatsapp: string } | null
  videos: { id: string; r2_key: string; filename: string; size_bytes?: number }[]
}

export default function EmAndamentoClient({ order, editorId }: { order: Order | null; editorId: string }) {
  const [viralityGrade, setViralityGrade] = useState<ViralityGrade>('morno')
  const [feedback, setFeedback] = useState('')
  const [clipFile, setClipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  if (!order) {
    return (
      <div className="text-center py-16">
        <Film className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Nenhum pedido em andamento.</p>
        <p className="text-zinc-600 text-xs mt-1">Pegue um pedido na fila para começar.</p>
      </div>
    )
  }

  const briefing = order.briefing ?? {}
  const video = order.videos?.[0]

  async function handleSubmit() {
    if (!order) return
    if (!clipFile) { setError('Selecione o clipe finalizado.'); return }
    if (!feedback.trim()) { setError('Preencha o feedback antes de enviar.'); return }
    setUploading(true)
    setError('')

    try {
      // 1. Pede presigned URL ao servidor
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: clipFile.name, contentType: clipFile.type, size: clipFile.size }),
      })
      const { signedUrl, key } = await initRes.json()
      if (!signedUrl) throw new Error('Erro ao gerar URL de upload')

      // 2. Upload direto pro R2 via XHR (evita CORS issues e limite do Vercel)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl, true)
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
        body: JSON.stringify({ r2Key: key, filename: clipFile.name, viralityGrade, feedback }),
      })
      if (!submitRes.ok) throw new Error('Erro ao submeter pedido')

      router.push('/entregues')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar. Tente novamente.')
      setUploading(false)
    }
  }

  const revisionNotes = (briefing as Record<string, string>)._revision_notes
  const revisionAt    = (briefing as Record<string, string>)._revision_at

  return (
    <div className="space-y-6">
      {/* Revision notes banner — shown when admin requested changes */}
      {revisionNotes && (
        <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-900/50 flex items-center justify-center shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-amber-300 font-semibold text-sm mb-1">⚠️ Revisão Solicitada pelo Admin</p>
              <p className="text-amber-200/80 text-sm leading-relaxed">{revisionNotes}</p>
              {revisionAt && (
                <p className="text-amber-600 text-xs mt-2">
                  Solicitada em {new Date(revisionAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client + briefing */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-4">{order.profiles?.name}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-zinc-500 text-xs mb-0.5">Tom</p>
            <p className="text-zinc-300 text-sm">{TONE_LABELS[briefing.tone] ?? briefing.tone}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-0.5">CTA</p>
            <p className="text-zinc-300 text-sm">{CTA_LABELS[briefing.cta] ?? briefing.cta}</p>
          </div>
          {briefing.music && (
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Música</p>
              <p className="text-zinc-300 text-sm">{briefing.music}</p>
            </div>
          )}
          {briefing.editingStyle && (
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Estilo</p>
              <p className="text-zinc-300 text-sm">{briefing.editingStyle}</p>
            </div>
          )}
          {briefing.notes && (
            <div className="col-span-2">
              <p className="text-zinc-500 text-xs mb-0.5">Observações</p>
              <p className="text-zinc-300 text-sm">{briefing.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Raw video download */}
      {video && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-xs mb-3">Vídeo bruto</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-zinc-500" />
              <span className="text-white text-sm truncate max-w-xs">{video.filename}</span>
            </div>
            <a
              href={`/api/videos/${video.id}/download`}
              className="flex items-center gap-1.5 text-xs text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar
            </a>
          </div>
        </div>
      )}

      {/* Upload clip */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
        <p className="text-zinc-400 text-xs mb-3">Upload do clipe finalizado</p>
        <label className="border border-dashed border-zinc-700 rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-zinc-500 transition-colors block">
          <Upload className="w-6 h-6 text-zinc-600 mb-2" />
          <p className="text-zinc-300 text-sm font-medium">
            {clipFile ? clipFile.name : 'Selecionar clipe finalizado'}
          </p>
          <p className="text-zinc-600 text-xs mt-1">MP4, MOV, AVI</p>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => setClipFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      {/* Virality grade */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
        <p className="text-zinc-400 text-xs mb-3">Grau de Viralização</p>
        <div className="grid grid-cols-4 gap-2">
          {VIRALITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setViralityGrade(opt.value)}
              className={`p-3 rounded-lg border text-center transition-colors ${
                viralityGrade === opt.value ? opt.bg : 'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              <span className={`text-sm font-medium ${viralityGrade === opt.value ? opt.color : 'text-zinc-500'}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
        <Label className="text-zinc-400 text-xs mb-3 block">Feedback do especialista *</Label>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Descreva os pontos fortes do conteúdo e o potencial de viralização..."
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 text-sm rounded-md px-3 py-2 resize-none focus:outline-none focus:border-zinc-600"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-3 py-2">{error}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={uploading}
        className="w-full bg-white text-black hover:bg-zinc-100 font-medium"
      >
        {uploading ? 'Enviando...' : 'Enviar para aprovação do admin'}
      </Button>
    </div>
  )
}
