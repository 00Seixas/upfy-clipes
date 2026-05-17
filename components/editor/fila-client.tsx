'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, User, ChevronDown, ChevronUp, Music, Megaphone, Palette, FileText, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderInQueue {
  id: string
  status: string
  briefing: Record<string, string>
  created_at: string
  deadline?: string
  profiles: { name: string; whatsapp: string } | null
}

const TONE_LABELS: Record<string, string> = {
  'engraçado': '😄 Engraçado',
  educativo: '📚 Educativo',
  inspiracional: '💡 Inspiracional',
  'polêmico': '🔥 Polêmico',
}

const CTA_LABELS: Record<string, string> = {
  segue_la: '👆 Segue lá',
  link_na_bio: '🔗 Link na bio',
  nenhum: '— Nenhum',
}

function isUrgent(deadline?: string): boolean {
  if (!deadline) return false
  const diff = new Date(deadline).getTime() - Date.now()
  return diff < 24 * 60 * 60 * 1000 && diff > 0
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `há ${days} dia${days > 1 ? 's' : ''}`
  if (hours > 0) return `há ${hours}h`
  const mins = Math.floor(diff / 60000)
  if (mins > 0) return `há ${mins}min`
  return 'agora há pouco'
}

export default function FilaClient({ orders, editorId }: { orders: OrderInQueue[]; editorId: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const router = useRouter()

  async function handlePick(orderId: string) {
    setLoading(orderId)
    const res = await fetch(`/api/orders/${orderId}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const data = await res.json()
      alert('Erro ao pegar pedido: ' + (data.error ?? res.status))
      setLoading(null)
      return
    }
    router.push('/em-andamento')
    router.refresh()
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <Film className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm font-medium">Fila vazia por enquanto</p>
        <p className="text-zinc-600 text-xs mt-1">Novos pedidos aparecerão aqui assim que os clientes enviarem vídeos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order, index) => {
        const urgent = isUrgent(order.deadline)
        const briefing = order.briefing ?? {}
        const isOpen = expanded === order.id

        return (
          <div
            key={order.id}
            className={`bg-[#111113] border rounded-xl overflow-hidden transition-all ${
              urgent ? 'border-red-900/50' : 'border-zinc-800'
            }`}
          >
            {/* Header */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Position + client name */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">
                      #{index + 1}
                    </span>
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-white text-sm font-semibold truncate">
                      {order.profiles?.name ?? 'Cliente'}
                    </span>
                    {urgent && (
                      <span className="flex items-center gap-1 text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-2 py-0.5 rounded-full shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        Urgente
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Enviado {timeAgo(order.created_at)}
                    </span>
                    {order.deadline && (
                      <span className={`flex items-center gap-1 ${urgent ? 'text-red-400 font-medium' : ''}`}>
                        Prazo: {new Date(order.deadline).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  {/* Briefing resumido */}
                  <div className="flex flex-wrap gap-2">
                    {briefing.tone && (
                      <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md">
                        {TONE_LABELS[briefing.tone] ?? briefing.tone}
                      </span>
                    )}
                    {briefing.cta && briefing.cta !== 'nenhum' && (
                      <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md">
                        {CTA_LABELS[briefing.cta] ?? briefing.cta}
                      </span>
                    )}
                    {briefing.music && (
                      <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md flex items-center gap-1">
                        <Music className="w-3 h-3" />
                        {briefing.music}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handlePick(order.id)}
                    disabled={loading === order.id}
                    className="bg-white text-black hover:bg-zinc-100 text-xs h-8 px-4"
                  >
                    {loading === order.id ? 'Pegando...' : 'Pegar pedido'}
                  </Button>
                  <button
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isOpen ? 'Menos' : 'Ver briefing completo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Briefing expandido */}
            {isOpen && (
              <div className="border-t border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Briefing completo</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Tom do conteúdo
                    </p>
                    <p className="text-zinc-200 text-sm">{TONE_LABELS[briefing.tone] ?? briefing.tone ?? '—'}</p>
                  </div>

                  <div>
                    <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
                      <Megaphone className="w-3 h-3" /> CTA
                    </p>
                    <p className="text-zinc-200 text-sm">{CTA_LABELS[briefing.cta] ?? briefing.cta ?? '—'}</p>
                  </div>

                  {briefing.music && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
                        <Music className="w-3 h-3" /> Música preferida
                      </p>
                      <p className="text-zinc-200 text-sm">{briefing.music}</p>
                    </div>
                  )}

                  {briefing.editingStyle && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
                        <Film className="w-3 h-3" /> Estilo de edição
                      </p>
                      <p className="text-zinc-200 text-sm">{briefing.editingStyle}</p>
                    </div>
                  )}

                  {briefing.notes && (
                    <div className="md:col-span-2">
                      <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Observações
                      </p>
                      <p className="text-zinc-200 text-sm whitespace-pre-line bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                        {briefing.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-800">
                  <Button
                    onClick={() => handlePick(order.id)}
                    disabled={loading === order.id}
                    className="w-full bg-white text-black hover:bg-zinc-100 font-medium"
                  >
                    {loading === order.id ? 'Pegando...' : '✓ Confirmar e pegar esse pedido'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
