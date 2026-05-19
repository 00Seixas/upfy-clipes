'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Key } from 'lucide-react'

interface Editor {
  id: string
  name: string
  email: string
  created_at: string
  total_clips: number
  month_clips: number
}

export default function EditoresClient({ initialEditors }: { initialEditors: Editor[] }) {
  const [editors, setEditors] = useState(initialEditors)
  const [showForm, setShowForm] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState<Editor | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [newPassword, setNewPassword] = useState('')
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/editors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setShowForm(false)
      setForm({ name: '', email: '', password: '' })
      setSuccess('Editor criado com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
      // Refresh list
      const r = await fetch('/api/admin/editors')
      const d = await r.json()
      if (d.editors) setEditors(d.editors)
    } else {
      alert('Erro: ' + (data.error ?? 'Falha ao criar editor'))
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!showPasswordModal) return
    setLoading(true)
    const res = await fetch(`/api/admin/editors/${showPasswordModal.id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setShowPasswordModal(null)
      setNewPassword('')
      setSuccess(`Senha de ${showPasswordModal.name} alterada!`)
      setTimeout(() => setSuccess(''), 3000)
    } else {
      alert('Erro: ' + (data.error ?? 'Falha ao alterar senha'))
    }
  }

  return (
    <>
      {success && (
        <div className="mb-4 p-3 bg-green-500/[0.08] border border-green-500/20 rounded-xl text-green-400 text-sm">
          {success}
        </div>
      )}

      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-white text-black hover:bg-zinc-100 text-sm px-3 h-8 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo editor
        </button>
      </div>

      {editors.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-600 text-sm">Nenhum editor cadastrado.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          {editors.map((editor, idx) => {
            const isLast = idx === editors.length - 1
            const loadPercent = Math.min(100, Math.round((editor.month_clips / Math.max(editor.month_clips, 20)) * 100))
            return (
              <div
                key={editor.id}
                className={`flex items-center gap-4 px-4 py-3.5 bg-[#080809] hover:bg-[#0c0c0e] transition-colors ${!isLast ? 'border-b border-white/[0.04]' : ''}`}
              >
                {/* Online dot (static placeholder) */}
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0">
                  {editor.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm font-semibold">{editor.name}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{editor.email}</p>
                </div>
                {/* Workload bar */}
                <div className="hidden sm:block w-20 shrink-0">
                  <div className="w-full bg-white/[0.04] rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-white/30 transition-all"
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>
                  <p className="text-zinc-700 text-[10px] mt-0.5 text-right">{editor.month_clips} esse mês</p>
                </div>
                <div className="text-right shrink-0 hidden md:block">
                  <p className="text-zinc-400 text-xs font-medium">{editor.total_clips}</p>
                  <p className="text-zinc-700 text-[10px]">total</p>
                </div>
                <button
                  onClick={() => { setShowPasswordModal(editor); setNewPassword('') }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] text-zinc-600 hover:text-zinc-300 transition-colors text-xs"
                  title="Alterar senha"
                >
                  <Key className="w-3.5 h-3.5" />
                  Senha
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Criar editor */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="ml-auto w-full max-w-md bg-[#080809] border-l border-white/[0.06] p-6 relative z-10 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold">Novo editor</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-xs">Nome completo</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-xs">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-xs">Senha <span className="text-zinc-700">(vazio = gerar automaticamente)</span></label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-zinc-100 font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar editor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Alterar senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowPasswordModal(null)} />
          <div className="relative z-10 w-full max-w-sm bg-[#080809] border border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">Alterar senha</h2>
              <button onClick={() => setShowPasswordModal(null)} className="text-zinc-600 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-zinc-600 text-xs mb-4">{showPasswordModal.name} · {showPasswordModal.email}</p>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-xs">Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-zinc-100 font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
