'use client'

import { useState } from 'react'
import { Palette, Plus, CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STYLE_ICONS: Record<string, string> = {
  raiam: '⚡',
  'corte-direto': '🎯',
  'podcast-viral': '🎙️',
  educativo: '📚',
}

interface Estilo {
  id: string
  name: string
  description: string | null
  preview_url: string | null
  is_active: boolean
}

export default function AdminEstilosClient({ estilos }: { estilos: Estilo[] }) {
  const [activeIds, setActiveIds] = useState<Set<string>>(
    new Set(estilos.filter((e) => e.is_active).map((e) => e.id))
  )

  function toggleActive(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // TODO: PATCH /api/admin/estilos/:id { is_active }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Estilos de Clipe
          </h1>
          <p className="text-muted-foreground mt-1">
            {estilos.length} estilos · {activeIds.size} ativos
          </p>
        </div>
        <Button size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo estilo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {estilos.map((estilo) => {
          const isActive = activeIds.has(estilo.id)
          const icon = STYLE_ICONS[estilo.id] ?? '🎬'
          return (
            <Card
              key={estilo.id}
              className={cn(
                'cursor-pointer transition-all',
                isActive
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-upfy-border hover:border-upfy-border-2'
              )}
              onClick={() => toggleActive(estilo.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="text-2xl">{icon}</div>
                  {isActive ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{estilo.name}</p>
                  {estilo.description && (
                    <p className="text-xs text-muted-foreground mt-1">{estilo.description}</p>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  )}
                >
                  {isActive ? 'Ativo' : 'Inativo'}
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
