'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X, ChevronRight } from 'lucide-react'

type ContractStatus = 'ativo' | 'encerrando' | 'aguardando_renovacao' | 'encerrado'

const STATUS_CONFIG: Record<ContractStatus, { label: string; dot: string; badge: string }> = {
  ativo: { label: 'Ativo', dot: 'bg-green-400', badge: 'text-green-400 bg-green-400/10 border-green-400/20' },
  encerrando: { label: 'Encerrando', dot: 'bg-yellow-400', badge: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  aguardando_renovacao: { label: 'Aguard. renovação', dot: 'bg-red-400', badge: 'text-red-400 bg-red-400/10 border-red-400/20' },
  encerrado: { label: 'Encerrado', dot: 'bg-zinc-500', badge: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
}

const FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'encerrando', label: 'Encerrando' },
  { value: 'aguardando_renovacao', label: 'Aguard. renovação' },
  { value: 'encerrado', label: 'Encerrados' },
]

interface Contract {
  id: string
  clips_total: number
  clips_delivered: number
  start_date: string
  end_date: string
  status: ContractStatus
  payment_link?: string
  notes?: string
}

interface Client {
  id: string
  name: string
  whatsapp: string
  created_at: string
  client_contracts: Contract[]
}

const DEFAULT_WELCOME = (name: string, whatsapp: string, password: string, clipsTotal: number, daysTotal: number, appUrl: string) =>
`Olá ${name}! Seja bem-vindo à UPFY Mídia 🎬

Você contratou ${clipsTotal} clipes que serão entregues ao longo de ${daysTotal} dias — um por dia direto aqui no seu WhatsApp.

Acessa sua plataforma:
🔗 ${appUrl}
📱 Login: ${whatsapp}
🔑 Senha: ${password}

Upa os vídeos que quer transformar em clipes. Todo dia quando seu clipe ficar pronto você recebe o link aqui pra baixar e postar.

Qualquer dúvida é só chamar. Bora crescer! 🚀`

export default function ClientesClient({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients)
  const [filter, setFilter] = useState('todos')

  useEffect(() => { setClients(initialClients) }, [initialClients])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [welcomeModal, setWelcomeModal] = useState<{
    clientId: string
    message: string
    sending: boolean
  } | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '', whatsapp: '', password: '', clipsTotal: '30', daysTotal: '30', paymentLink: '', notes: ''
  })

  const router = useRouter()

  const filteredClients = clients.filter(c => {
    const contract = c.client_contracts[0]
    if (filter === 'todos') return true
    return contract?.status === filter
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        whatsapp: form.whatsapp,
        password: form.password || undefined,
        clipsTotal: parseInt(form.clipsTotal),
        daysTotal: parseInt(form.daysTotal),
        paymentLink: form.paymentLink,
        notes: form.notes,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setShowForm(false)
      setForm({ name: '', whatsapp: '', password: '', clipsTotal: '30', daysTotal: '30', paymentLink: '', notes: '' })
      if (!data.whatsappSent) {
        const msg = DEFAULT_WELCOME(
          form.name,
          form.whatsapp,
          data.password,
          parseInt(form.clipsTotal),
          parseInt(form.daysTotal),
          process.env.NEXT_PUBLIC_APP_URL ?? 'https://clipes.upfymidia.com'
        )
        setWelcomeModal({ clientId: data.user.id, message: msg, sending: false })
      }
      // Busca lista atualizada direto da API
      const fresh = await fetch('/api/admin/clients').then(r => r.json())
      if (fresh.clients) setClients(fresh.clients)
      router.refresh()
    }
  }

  async function handleSendWelcome() {
    if (!welcomeModal) return
    setWelcomeModal(m => m ? { ...m, sending: true } : m)
    await fetch(`/api/admin/clients/${welcomeModal.clientId}/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: welcomeModal.message }),
    })
    setWelcomeModal(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1.5">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                filter === opt.value ? 'bg-white text-black font-medium' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03] border border-white/[0.06]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-white text-black hover:bg-zinc-100 text-sm px-3 h-8 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo cliente
        </button>
      </div>

      {filteredClients.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-600 text-sm">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          {filteredClients.map((client, idx) => {
            const contract = client.client_contracts[0]
            const status = contract?.status ?? 'encerrado'
            const sConfig = STATUS_CONFIG[status as ContractStatus]
            const daysLeft = contract
              ? Math.max(0, Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : 0
            const isLast = idx === filteredClients.length - 1

            return (
              <Link
                key={client.id}
                href={`/clientes/${client.id}`}
                className={`flex items-center gap-4 px-4 py-3.5 bg-[#080809] hover:bg-[#0c0c0e] transition-colors ${!isLast ? 'border-b border-white/[0.04]' : ''}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${sConfig.dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm font-semibold">{client.name}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{client.whatsapp}</p>
                </div>
                {contract && (
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-zinc-400 text-xs">{contract.clips_delivered}/{contract.clips_total} clipes</p>
                    <p className="text-zinc-600 text-xs">{daysLeft}d restantes</p>
                  </div>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sConfig.badge} shrink-0`}>
                  {sConfig.label}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {/* New client form slide-over */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="ml-auto w-full max-w-md bg-[#080809] border-l border-white/[0.06] p-6 overflow-y-auto relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold">Novo cliente</h2>
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
                <label className="text-zinc-500 text-xs">WhatsApp (login)</label>
                <input
                  value={form.whatsapp}
                  onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  required
                  placeholder="5511999999999"
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-xs">Senha <span className="text-zinc-700">(vazio = gerar automaticamente)</span></label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="ex: Cliente@123"
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-500 text-xs">Qtd. de clipes</label>
                  <input
                    type="number"
                    value={form.clipsTotal}
                    onChange={e => setForm(f => ({ ...f, clipsTotal: e.target.value }))}
                    required
                    className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-zinc-500 text-xs">Prazo (dias)</label>
                  <input
                    type="number"
                    value={form.daysTotal}
                    onChange={e => setForm(f => ({ ...f, daysTotal: e.target.value }))}
                    required
                    className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-xs">Link de pagamento (renovação)</label>
                <input
                  value={form.paymentLink}
                  onChange={e => setForm(f => ({ ...f, paymentLink: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5 text-zinc-300 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-xs">Observações internas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-3 text-zinc-300 text-sm placeholder:text-zinc-700 resize-none focus:outline-none focus:border-white/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-zinc-100 font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Welcome message modal */}
      {welcomeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-white font-semibold mb-1">Mensagem de boas-vindas</h2>
            <p className="text-zinc-500 text-sm mb-4">Edite o texto se quiser antes de enviar via WhatsApp.</p>
            <textarea
              value={welcomeModal.message}
              onChange={e => setWelcomeModal(m => m ? { ...m, message: e.target.value } : m)}
              rows={12}
              className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-3 text-zinc-300 text-sm resize-none focus:outline-none focus:border-white/20 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setWelcomeModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Pular por agora
              </button>
              <button
                onClick={handleSendWelcome}
                disabled={welcomeModal.sending}
                className="flex-1 bg-white text-black hover:bg-zinc-100 text-sm py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {welcomeModal.sending ? 'Enviando...' : 'Enviar mensagem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
