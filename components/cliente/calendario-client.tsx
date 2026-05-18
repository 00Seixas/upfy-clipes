'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Loader2, CheckCircle2 } from 'lucide-react'

interface ScheduledPost {
  id: string
  platform: 'tiktok' | 'instagram'
  scheduled_at: string
  caption: string | null
  status: 'pending' | 'posted' | 'failed'
  posted_at: string | null
  deliverable_id: string | null
  deliverables: { clip_number: number } | null
}

interface ApprovedClip {
  id: string
  clip_number: number
  delivered_at: string
}

interface CalendarioClientProps {
  scheduledPosts: ScheduledPost[]
  approvedClips: ApprovedClip[]
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  // Pad to complete last week
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function groupPostsByDay(posts: ScheduledPost[]) {
  const map: Record<string, ScheduledPost[]> = {}
  for (const p of posts) {
    const d = new Date(p.scheduled_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map[key]) map[key] = []
    map[key].push(p)
  }
  return map
}

function PlatformDot({ platform }: { platform: 'tiktok' | 'instagram' }) {
  if (platform === 'tiktok') {
    return <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
  }
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: 'linear-gradient(135deg, #f9a8d4, #a855f7)' }}
    />
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.8 1.54V6.78a4.85 4.85 0 0 1-1.03-.09z"/>
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

interface ScheduleFormProps {
  approvedClips: ApprovedClip[]
  selectedDate: string
  onClose: () => void
  onScheduled: (post: ScheduledPost) => void
}

function ScheduleForm({ approvedClips, selectedDate, onClose, onScheduled }: ScheduleFormProps) {
  const [clipId, setClipId] = useState('')
  const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok')
  const [time, setTime] = useState('12:00')
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clipId) { setError('Selecione um clipe'); return }
    setLoading(true)
    setError(null)
    try {
      const scheduledAt = new Date(`${selectedDate}T${time}:00`).toISOString()
      const res = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverableId: clipId,
          platform,
          scheduledAt,
          caption: caption || null,
        }),
      })
      const data = await res.json() as { success?: boolean; id?: string; error?: string }
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao agendar')
        return
      }
      const clip = approvedClips.find(c => c.id === clipId)
      const newPost: ScheduledPost = {
        id: data.id!,
        platform,
        scheduled_at: new Date(`${selectedDate}T${time}:00`).toISOString(),
        caption: caption || null,
        status: 'pending',
        posted_at: null,
        deliverable_id: clipId,
        deliverables: clip ? { clip_number: clip.clip_number } : null,
      }
      onScheduled(newPost)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0e0e10] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <p className="text-white font-semibold text-sm">Agendar Postagem</p>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date display */}
          <div className="text-zinc-500 text-xs">
            Data: <span className="text-zinc-300 font-medium">{new Date(`${selectedDate}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          </div>

          {/* Clip select */}
          <div>
            <label className="block text-zinc-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Clipe</label>
            {approvedClips.length === 0 ? (
              <p className="text-zinc-600 text-sm">Nenhum clipe aprovado disponível.</p>
            ) : (
              <select
                value={clipId}
                onChange={e => setClipId(e.target.value)}
                className="w-full bg-zinc-950 border border-white/[0.08] focus:border-white/[0.2] rounded-xl px-4 py-2.5 text-zinc-300 text-sm focus:outline-none transition-colors"
              >
                <option value="">Selecionar clipe...</option>
                {approvedClips.map(c => (
                  <option key={c.id} value={c.id}>Clipe #{c.clip_number}</option>
                ))}
              </select>
            )}
          </div>

          {/* Platform */}
          <div>
            <label className="block text-zinc-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Plataforma</label>
            <div className="grid grid-cols-2 gap-2">
              {(['tiktok', 'instagram'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    platform === p
                      ? 'border-white/20 bg-white/[0.07] text-white'
                      : 'border-white/[0.06] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.1]'
                  }`}
                >
                  {p === 'tiktok'
                    ? <TikTokIcon className="w-3.5 h-3.5" />
                    : <InstagramIcon className="w-3.5 h-3.5" />
                  }
                  {p === 'tiktok' ? 'TikTok' : 'Instagram'}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-zinc-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Horário</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-zinc-950 border border-white/[0.08] focus:border-white/[0.2] rounded-xl px-4 py-2.5 text-zinc-300 text-sm focus:outline-none transition-colors"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-zinc-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Legenda <span className="text-zinc-700 normal-case">(opcional)</span></label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={3}
              placeholder="Escreva a legenda da postagem..."
              className="w-full bg-zinc-950 border border-white/[0.08] focus:border-white/[0.2] rounded-xl px-4 py-3 text-zinc-300 text-sm resize-none focus:outline-none transition-colors placeholder-zinc-700"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || approvedClips.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-zinc-100 text-black font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Agendando...' : 'Agendar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CalendarioClient({ scheduledPosts, approvedClips }: CalendarioClientProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [allPosts, setAllPosts] = useState<ScheduledPost[]>(scheduledPosts)

  const days = getCalendarDays(year, month)
  const postsByDay = groupPostsByDay(allPosts)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  function handleScheduled(post: ScheduledPost) {
    setAllPosts(prev => [...prev, post])
    setShowForm(false)
  }

  const selectedKey = selectedDay ? toDateKey(year, month, selectedDay) : null
  const selectedPosts = selectedKey ? (postsByDay[selectedKey] ?? []) : []

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-white font-semibold text-sm">
            {MONTHS_PT[month]} {year}
          </p>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-white/[0.04]">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="py-2 text-center text-zinc-700 text-[10px] font-bold uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={`null-${i}`} className="min-h-[52px] border-b border-r border-white/[0.03]" />
            }
            const key = toDateKey(year, month, day)
            const dayPosts = postsByDay[key] ?? []
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
            const isSelected = selectedDay === day
            const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(d => d === day ? null : day)}
                className={`min-h-[52px] p-1.5 border-b border-r border-white/[0.03] text-left flex flex-col transition-all duration-150 ${
                  isSelected
                    ? 'bg-white/[0.07]'
                    : 'hover:bg-white/[0.03]'
                } ${isPast && !isSelected ? 'opacity-60' : ''}`}
              >
                <span
                  className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1 ${
                    isToday
                      ? 'border border-white text-white'
                      : isSelected
                        ? 'text-white'
                        : 'text-zinc-500'
                  }`}
                >
                  {day}
                </span>
                {dayPosts.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {dayPosts.slice(0, 3).map(p => (
                      <PlatformDot key={p.id} platform={p.platform} />
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[8px] text-zinc-600">+{dayPosts.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <span className="text-zinc-600 text-[10px]">TikTok</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, #f9a8d4, #a855f7)' }} />
          <span className="text-zinc-600 text-[10px]">Instagram</span>
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay !== null && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
            <p className="text-zinc-300 text-sm font-semibold">
              {new Date(year, month, selectedDay).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar
            </button>
          </div>

          {selectedPosts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-zinc-600 text-sm">Nenhuma postagem agendada para este dia.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {selectedPosts.map(post => {
                const time = new Date(post.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const clipNum = post.deliverables?.clip_number
                const isPosted = post.status === 'posted'
                const isFailed = post.status === 'failed'

                return (
                  <div
                    key={post.id}
                    className={`flex items-center gap-4 px-5 py-3.5 ${isPosted ? 'opacity-50' : ''}`}
                  >
                    <div className="shrink-0">
                      {post.platform === 'tiktok'
                        ? <TikTokIcon className="w-4 h-4 text-zinc-400" />
                        : <InstagramIcon className="w-4 h-4 text-zinc-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-sm font-medium">
                        {clipNum ? `Clipe #${clipNum}` : 'Clipe'} · {post.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                      </p>
                      {post.caption && (
                        <p className="text-zinc-600 text-xs truncate mt-0.5">{post.caption}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-zinc-600 text-xs">{time}</span>
                      {isPosted && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                      {isFailed && <span className="text-[10px] text-red-500 font-medium">Falhou</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Schedule form modal */}
      {showForm && selectedDay !== null && (
        <ScheduleForm
          approvedClips={approvedClips}
          selectedDate={toDateKey(year, month, selectedDay)}
          onClose={() => setShowForm(false)}
          onScheduled={handleScheduled}
        />
      )}
    </div>
  )
}
