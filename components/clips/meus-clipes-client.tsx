'use client'
import { useState } from 'react'
import { ChevronRight, Folder, FolderOpen, Film, Download, ArrowLeft } from 'lucide-react'
import type { ViralityGrade } from '@/types'

interface Deliverable {
  id: string
  clip_number: number
  virality_grade: ViralityGrade
  feedback: string
  delivered_at: string
  r2_key: string
  filename: string
}

const VIRALITY_CONFIG: Record<ViralityGrade, { label: string; color: string }> = {
  frio: { label: 'Frio', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  morno: { label: 'Morno', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  quente: { label: 'Quente', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  viral: { label: 'Viral', color: 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' },
}

function groupByMonthDay(deliverables: Deliverable[]) {
  const months: Record<string, Record<string, Deliverable[]>> = {}
  for (const d of deliverables) {
    const date = new Date(d.delivered_at)
    const month = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    if (!months[month]) months[month] = {}
    if (!months[month][day]) months[month][day] = []
    months[month][day].push(d)
  }
  return months
}

export default function MeusClipesClient({ deliverables }: { deliverables: Deliverable[] }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedClip, setSelectedClip] = useState<Deliverable | null>(null)

  const grouped = groupByMonthDay(deliverables)
  const months = Object.keys(grouped)

  if (deliverables.length === 0) {
    return (
      <div className="text-center py-16">
        <Film className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Nenhum clipe entregue ainda.</p>
      </div>
    )
  }

  // Clip detail view
  if (selectedClip) {
    const vConfig = VIRALITY_CONFIG[selectedClip.virality_grade]
    return (
      <div>
        <button
          onClick={() => setSelectedClip(null)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Clipe {selectedClip.clip_number}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${vConfig.color}`}>
              {vConfig.label}
            </span>
          </div>
          <div className="bg-zinc-900 rounded-lg aspect-video mb-4 flex items-center justify-center">
            <video
              src={`/api/clips/${selectedClip.id}/stream`}
              controls
              className="w-full h-full rounded-lg"
            />
          </div>
          <div className="mb-4">
            <p className="text-zinc-400 text-xs mb-1">Feedback do especialista</p>
            <p className="text-white text-sm">{selectedClip.feedback}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-zinc-500 text-xs">
              {new Date(selectedClip.delivered_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric'
              })}
            </p>
            <a
              href={`/api/clips/${selectedClip.id}/download`}
              className="flex items-center gap-1.5 text-sm text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Day view
  if (selectedMonth && selectedDay) {
    const clips = grouped[selectedMonth][selectedDay]
    return (
      <div>
        <button
          onClick={() => setSelectedDay(null)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {selectedMonth}
        </button>
        <h2 className="text-white font-medium mb-4">{selectedDay}</h2>
        <div className="space-y-2">
          {clips.map(clip => {
            const vConfig = VIRALITY_CONFIG[clip.virality_grade]
            return (
              <button
                key={clip.id}
                onClick={() => setSelectedClip(clip)}
                className="w-full flex items-center gap-3 p-4 bg-[#111113] border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors text-left"
              >
                <Film className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="text-white text-sm flex-1">Clipe {clip.clip_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${vConfig.color}`}>
                  {vConfig.label}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Month view
  if (selectedMonth) {
    const days = Object.keys(grouped[selectedMonth])
    return (
      <div>
        <button
          onClick={() => setSelectedMonth(null)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Todos os meses
        </button>
        <h2 className="text-white font-medium mb-4 capitalize">{selectedMonth}</h2>
        <div className="space-y-2">
          {days.map(day => {
            const clips = grouped[selectedMonth][day]
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className="w-full flex items-center gap-3 p-4 bg-[#111113] border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors text-left"
              >
                <Folder className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="text-white text-sm flex-1">{day}</span>
                <span className="text-zinc-500 text-xs">{clips.length} clipe{clips.length !== 1 ? 's' : ''}</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Root: months
  return (
    <div className="space-y-2">
      {months.map(month => {
        const totalClips = Object.values(grouped[month]).flat().length
        return (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            className="w-full flex items-center gap-3 p-4 bg-[#111113] border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors text-left"
          >
            <FolderOpen className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <span className="text-white text-sm flex-1 capitalize">{month}</span>
            <span className="text-zinc-500 text-xs">{totalClips} clipe{totalClips !== 1 ? 's' : ''}</span>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>
        )
      })}
    </div>
  )
}
