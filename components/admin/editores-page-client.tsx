'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Film, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        <div className="mb-4 p-3 bg-green-950/30 border border-green-900/50 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowForm(true)} className="bg-white text-black hover:bg-zinc-100 text-sm h-8">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Novo editor
        </Button>
      </div>

      {editors.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">Nenhum editor cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {editors.map(editor => (
            <div key={editor.id} className="flex items-center gap-4 p-4 bg-[#111113] border border-zinc-800 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{editor.name}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{editor.email}</p>
              </div>
              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <p className="text-zinc-300 text-xs">{editor.total_clips} total</p>
                  <p className="text-zinc-500 text-xs">{editor.month_clips} esse mês</p>
                </div>
                <button
                  onClick={() => { setShowPasswordModal(editor); setNewPassword('') }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors text-xs"
                  title="Alterar senha"
                >
                  <Key className="w-3.5 h-3.5" />
                  Senha
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar editor */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="ml-auto w-full max-w-md bg-[#111113] border-l border-zinc-800 p-6 relative z-10 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold">Novo editor</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Nome completo</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="bg-zinc-900 border-zinc-700 text-white h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                  className="bg-zinc-900 border-zinc-700 text-white h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Senha <span className="text-zinc-600">(deixe em branco para gerar automaticamente)</span></Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="bg-zinc-900 border-zinc-700 text-white h-9 placeholder:text-zinc-600"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-zinc-100 font-medium">
                {loading ? 'Criando...' : 'Criar editor'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Alterar senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowPasswordModal(null)} />
          <div className="relative z-10 w-full max-w-sm bg-[#111113] border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">Alterar senha</h2>
              <button onClick={() => setShowPasswordModal(null)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-zinc-500 text-xs mb-4">{showPasswordModal.name} • {showPasswordModal.email}</p>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Nova senha</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="bg-zinc-900 border-zinc-700 text-white h-9 placeholder:text-zinc-600"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-zinc-100 font-medium">
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
