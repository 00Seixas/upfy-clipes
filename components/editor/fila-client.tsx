'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderInQueue {
  id: string
  status: string
  briefing: Record<string, string>
  created_at: string
  deadline?: string
  profiles: { name: string; whatsapp: string } | null
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
  return 'agora'
}

export default function FilaClient({ orders, editorId }: { orders: OrderInQueue[]; editorId: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handlePick(orderId: string) {
    setLoading(orderId)
    await fetch(`/api/orders/${orderId}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    router.push('/editor/em-andamento')
    router.refresh()
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">Nenhum pedido na fila no momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const urgent = isUrgent(order.deadline)
        return (
          <div key={order.id} className={`bg-[#111113] border rounded-xl p-5 ${urgent ? 'border-red-900/50' : 'border-zinc-800'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-white text-sm font-medium">{order.profiles?.name ?? 'Cliente'}</span>
                  {urgent && (
                    <span className="flex items-center gap-1 text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Urgente
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(order.created_at)}
                  </span>
                  <span>Upload avulso</span>
                  {order.deadline && (
                    <span className={urgent ? 'text-red-400' : ''}>
                      prazo: {new Date(order.deadline).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handlePick(order.id)}
                disabled={loading === order.id}
                className="bg-white text-black hover:bg-zinc-100 text-xs h-8 shrink-0"
              >
                {loading === order.id ? 'Pegando...' : 'Pegar esse pedido'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
