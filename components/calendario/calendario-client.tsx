'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DeliveryDay {
  id: string
  clip_number: number
  delivered_at: string
}

export default function CalendarioClient({ deliverables }: { deliverables: DeliveryDay[] }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Build delivery map: 'YYYY-MM-DD' → clip_number[]
  const deliveryMap: Record<string, number[]> = {}
  for (const d of deliverables) {
    const date = new Date(d.delivered_at)
    const key = date.toISOString().split('T')[0]
    if (!deliveryMap[key]) deliveryMap[key] = []
    deliveryMap[key].push(d.clip_number)
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  return (
    <div className="bg-[#111113] border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-white font-medium capitalize">{monthName}</h2>
        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="text-center text-xs text-zinc-600 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const clips = deliveryMap[dateKey] || []
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          const isFuture = new Date(year, month, day) > today
          const hasDelivery = clips.length > 0

          return (
            <div
              key={day}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center p-1 transition-colors ${
                hasDelivery
                  ? 'bg-zinc-800 border border-zinc-600'
                  : isToday
                  ? 'border border-zinc-700'
                  : isFuture
                  ? 'opacity-30'
                  : 'opacity-40'
              }`}
            >
              <span className={`text-xs font-medium ${hasDelivery ? 'text-white' : 'text-zinc-500'}`}>
                {day}
              </span>
              {hasDelivery && (
                <span className="text-[9px] text-zinc-400 mt-0.5 leading-tight text-center">
                  {clips.map(n => `C${n}`).join(' ')}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-zinc-800 border border-zinc-600 rounded" />
          <span className="text-xs text-zinc-500">Com clipe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border border-zinc-700 rounded opacity-30" />
          <span className="text-xs text-zinc-500">Sem entrega</span>
        </div>
      </div>
    </div>
  )
}
