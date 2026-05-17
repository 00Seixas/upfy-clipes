// ─── Order Status ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'aguardando'
  | 'em_analise'
  | 'na_fila'
  | 'atribuido'
  | 'em_edicao'
  | 'revisao_interna'
  | 'pronto'
  | 'revisao_solicitada'
  | 'aprovacao'
  | 'entregue'
  | 'publicado'
  | 'cancelado'
  | 'falhou'
  | 'pausado'

export interface StatusConfig {
  label: string
  color: string
  bg: string
  border: string
  dot: string
  description: string
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  aguardando:          { label: 'Aguardando',         color: 'text-zinc-400',    bg: 'bg-zinc-900',       border: 'border-zinc-700',   dot: 'bg-zinc-500',    description: 'Aguardando atribuição' },
  em_analise:          { label: 'Em Análise',          color: 'text-blue-400',    bg: 'bg-blue-950/40',    border: 'border-blue-800',   dot: 'bg-blue-500',    description: 'Em análise pelo admin' },
  na_fila:             { label: 'Na Fila',             color: 'text-indigo-400',  bg: 'bg-indigo-950/40',  border: 'border-indigo-800', dot: 'bg-indigo-500',  description: 'Na fila para editores' },
  atribuido:           { label: 'Atribuído',           color: 'text-violet-400',  bg: 'bg-violet-950/40',  border: 'border-violet-800', dot: 'bg-violet-500',  description: 'Editor atribuído' },
  em_edicao:           { label: 'Em Edição',           color: 'text-amber-400',   bg: 'bg-amber-950/40',   border: 'border-amber-800',  dot: 'bg-amber-500',   description: 'Em edição ativa' },
  revisao_interna:     { label: 'Revisão Interna',     color: 'text-orange-400',  bg: 'bg-orange-950/40',  border: 'border-orange-800', dot: 'bg-orange-500',  description: 'Revisão interna do admin' },
  pronto:              { label: 'Pronto',              color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800',dot: 'bg-emerald-500', description: 'Pronto para o cliente' },
  revisao_solicitada:  { label: 'Revisão Solicitada',  color: 'text-red-400',     bg: 'bg-red-950/40',     border: 'border-red-800',    dot: 'bg-red-500',     description: 'Cliente solicitou revisão' },
  aprovacao:           { label: 'Aprovação',           color: 'text-teal-400',    bg: 'bg-teal-950/40',    border: 'border-teal-800',   dot: 'bg-teal-500',    description: 'Aguardando aprovação' },
  entregue:            { label: 'Entregue',            color: 'text-green-400',   bg: 'bg-green-950/40',   border: 'border-green-800',  dot: 'bg-green-500',   description: 'Entregue ao cliente' },
  publicado:           { label: 'Publicado',           color: 'text-cyan-400',    bg: 'bg-cyan-950/40',    border: 'border-cyan-800',   dot: 'bg-cyan-500',    description: 'Publicado nas redes' },
  cancelado:           { label: 'Cancelado',           color: 'text-zinc-500',    bg: 'bg-zinc-900',       border: 'border-zinc-800',   dot: 'bg-zinc-600',    description: 'Pedido cancelado' },
  falhou:              { label: 'Falhou',              color: 'text-red-600',     bg: 'bg-red-950/60',     border: 'border-red-900',    dot: 'bg-red-700',     description: 'Falha no processamento' },
  pausado:             { label: 'Pausado',             color: 'text-yellow-400',  bg: 'bg-yellow-950/40',  border: 'border-yellow-800', dot: 'bg-yellow-500',  description: 'Pedido pausado' },
}

export const TERMINAL_STATUSES: OrderStatus[] = ['entregue', 'publicado', 'cancelado', 'falhou']
export const ACTIVE_STATUSES: OrderStatus[] = ['aguardando', 'em_analise', 'na_fila', 'atribuido', 'em_edicao', 'revisao_interna', 'pronto', 'revisao_solicitada', 'aprovacao', 'pausado']

// ─── Priority ─────────────────────────────────────────────────────────────────

export type Priority = 'low' | 'normal' | 'high' | 'critical'

export interface PriorityConfig {
  label: string
  color: string
  bg: string
  border: string
}

export const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  low:      { label: 'Baixa',   color: 'text-zinc-500',   bg: 'bg-zinc-900',       border: 'border-zinc-700'  },
  normal:   { label: 'Normal',  color: 'text-zinc-300',   bg: 'bg-zinc-800',       border: 'border-zinc-700'  },
  high:     { label: 'Alta',    color: 'text-orange-400', bg: 'bg-orange-950/40',  border: 'border-orange-800'},
  critical: { label: 'Crítica', color: 'text-red-400',    bg: 'bg-red-950/40',     border: 'border-red-800'   },
}

// ─── Difficulty ───────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface DifficultyConfig {
  label: string
  color: string
  score: number
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:   { label: 'Fácil',   color: 'text-emerald-400', score: 1 },
  medium: { label: 'Médio',   color: 'text-amber-400',   score: 2 },
  hard:   { label: 'Difícil', color: 'text-orange-400',  score: 3 },
  expert: { label: 'Expert',  color: 'text-red-400',     score: 4 },
}

// ─── Workload ─────────────────────────────────────────────────────────────────

export type WorkloadCategory = 'light' | 'moderate' | 'heavy' | 'critical'

export interface WorkloadConfig {
  label: string
  color: string
  bg: string
  border: string
  maxScore: number
}

export const WORKLOAD_CONFIG: Record<WorkloadCategory, WorkloadConfig> = {
  light:    { label: 'Leve',     color: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-800', maxScore: 4        },
  moderate: { label: 'Moderado', color: 'text-amber-400',   bg: 'bg-amber-950/30',   border: 'border-amber-800',   maxScore: 8        },
  heavy:    { label: 'Pesado',   color: 'text-orange-400',  bg: 'bg-orange-950/30',  border: 'border-orange-800',  maxScore: 14       },
  critical: { label: 'Crítico',  color: 'text-red-400',     bg: 'bg-red-950/30',     border: 'border-red-800',     maxScore: Infinity },
}

export interface WorkloadInfo {
  category: WorkloadCategory
  active_orders: number
  difficulty_score: number
  label: string
  color: string
  bg: string
}

// ─── Viral Grade ──────────────────────────────────────────────────────────────

export type ViralGrade = 'frio' | 'morno' | 'quente' | 'viral'

export const VIRAL_GRADE_CONFIG: Record<ViralGrade, { label: string; color: string; emoji: string }> = {
  frio:   { label: 'Frio',   color: 'text-blue-400',   emoji: '❄️' },
  morno:  { label: 'Morno',  color: 'text-amber-400',  emoji: '🌡️' },
  quente: { label: 'Quente', color: 'text-orange-400', emoji: '🔥' },
  viral:  { label: 'Viral',  color: 'text-red-400',    emoji: '🚀' },
}

// ─── Payout / Earning ─────────────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'rejected'
export type EarningStatus = 'pending' | 'available' | 'processing' | 'paid' | 'reversed'

export const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:    { label: 'Pendente',     color: 'text-amber-400',   bg: 'bg-amber-950/40',   border: 'border-amber-800'   },
  approved:   { label: 'Aprovado',     color: 'text-blue-400',    bg: 'bg-blue-950/40',    border: 'border-blue-800'    },
  processing: { label: 'Processando',  color: 'text-violet-400',  bg: 'bg-violet-950/40',  border: 'border-violet-800'  },
  paid:       { label: 'Pago',         color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800' },
  rejected:   { label: 'Rejeitado',    color: 'text-red-400',     bg: 'bg-red-950/40',     border: 'border-red-800'     },
}

export const EARNING_STATUS_CONFIG: Record<EarningStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pendente',     color: 'text-amber-400',   bg: 'bg-amber-950/40'   },
  available:  { label: 'Disponível',   color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
  processing: { label: 'Processando',  color: 'text-violet-400',  bg: 'bg-violet-950/40'  },
  paid:       { label: 'Pago',         color: 'text-green-400',   bg: 'bg-green-950/40'   },
  reversed:   { label: 'Estornado',    color: 'text-red-400',     bg: 'bg-red-950/40'     },
}

// ─── Domain Interfaces ────────────────────────────────────────────────────────

export interface EditorWallet {
  id: string
  editor_id: string
  balance_available_cents: number
  balance_pending_cents: number
  balance_processing_cents: number
  total_earned_cents: number
  created_at: string
  updated_at: string
}

export interface EditorEarning {
  id: string
  editor_id: string
  order_id: string
  gross_cents: number
  fee_cents: number
  net_cents: number
  status: EarningStatus
  description: string | null
  paid_at: string | null
  created_at: string
}

export interface EditorPayoutRequest {
  id: string
  editor_id: string
  amount_requested_cents: number
  fee_cents: number
  amount_net_cents: number
  status: PayoutStatus
  pix_key: string | null
  pix_key_type: string | null
  admin_notes: string | null
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
  editor?: { name: string; whatsapp?: string | null } | null
}

export interface EditorScore {
  id: string
  editor_id: string
  score_quality: number
  score_speed: number
  score_consistency: number
  total_completed: number
  total_late: number
  total_revisions_received: number
  avg_delivery_hours: number | null
  last_active_at: string | null
  updated_at: string
}

export interface OperationalLog {
  id: string
  actor_id: string | null
  actor_name: string | null
  actor_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface EnterpriseOrder {
  id: string
  client_id: string
  editor_id: string | null
  status: OrderStatus
  briefing: Record<string, string>
  deadline: string | null
  created_at: string
  updated_at: string
  priority: Priority
  is_urgent: boolean
  is_vip: boolean
  difficulty: Difficulty
  internal_notes: string | null
  clips_requested: number
  paused_at: string | null
  canceled_at: string | null
  sla_hours: number
  profiles?: { name: string; whatsapp: string | null } | null
  editor?: { name: string; email: string | null } | null
}

// ─── Utility Functions ────────────────────────────────────────────────────────

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatCentsShort(cents: number): string {
  const value = cents / 100
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`
  return `R$${value.toFixed(0)}`
}

export function getWorkloadCategory(difficultyScore: number): WorkloadCategory {
  if (difficultyScore <= 4)  return 'light'
  if (difficultyScore <= 8)  return 'moderate'
  if (difficultyScore <= 14) return 'heavy'
  return 'critical'
}

export function getWorkloadInfo(activeOrders: number, difficultyScore: number): WorkloadInfo {
  const category = getWorkloadCategory(difficultyScore)
  const config = WORKLOAD_CONFIG[category]
  return {
    category,
    active_orders: activeOrders,
    difficulty_score: difficultyScore,
    label: config.label,
    color: config.color,
    bg: config.bg,
  }
}

export function getSlaStatus(
  createdAt: string,
  slaHours: number,
  status: OrderStatus
): { label: string; color: string; isOverdue: boolean; hoursRemaining: number } {
  if (TERMINAL_STATUSES.includes(status)) {
    return { label: 'Concluído', color: 'text-zinc-500', isOverdue: false, hoursRemaining: 0 }
  }

  const startTime = new Date(createdAt).getTime()
  const deadline  = startTime + slaHours * 3_600_000
  const now       = Date.now()
  const hoursRemaining = Math.floor((deadline - now) / 3_600_000)

  if (hoursRemaining < 0) {
    return { label: `${Math.abs(hoursRemaining)}h atrasado`, color: 'text-red-400', isOverdue: true, hoursRemaining }
  }
  if (hoursRemaining < 4)  return { label: `${hoursRemaining}h`,    color: 'text-red-400',    isOverdue: false, hoursRemaining }
  if (hoursRemaining < 12) return { label: `${hoursRemaining}h`,    color: 'text-orange-400', isOverdue: false, hoursRemaining }
  if (hoursRemaining < 24) return { label: `${hoursRemaining}h`,    color: 'text-amber-400',  isOverdue: false, hoursRemaining }
  const daysRemaining = Math.floor(hoursRemaining / 24)
  return { label: `${daysRemaining}d`, color: 'text-zinc-400', isOverdue: false, hoursRemaining }
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days  > 0) return `há ${days}d`
  if (hours > 0) return `há ${hours}h`
  if (mins  > 0) return `há ${mins}min`
  return 'agora'
}
