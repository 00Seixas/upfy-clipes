export type Role = 'cliente' | 'editor' | 'admin'

export type ContractStatus = 'ativo' | 'encerrando' | 'aguardando_renovacao' | 'encerrado'

export type OrderStatus = 'aguardando' | 'em_edicao' | 'aprovacao' | 'entregue'

export type ViralityGrade = 'frio' | 'morno' | 'quente' | 'viral'

export type ContentTone = 'engraçado' | 'educativo' | 'inspiracional' | 'polêmico'

export type CTA = 'segue_la' | 'link_na_bio' | 'nenhum'

export type TargetPlatform = 'tiktok' | 'instagram'

export interface Briefing {
  tone: ContentTone
  music?: string
  cta: CTA
  editingStyle?: string
  notes?: string
  openingHook?: string
  platforms?: TargetPlatform[]
}

export interface User {
  id: string
  name: string
  whatsapp?: string
  email?: string
  role: Role
  created_at: string
}

export interface ClientContract {
  id: string
  user_id: string
  clips_total: number
  clips_delivered: number
  start_date: string
  end_date: string
  payment_link?: string
  notes?: string
  status: ContractStatus
}

export interface Order {
  id: string
  client_id: string
  editor_id?: string
  status: OrderStatus
  briefing: Briefing
  created_at: string
  deadline?: string
}

export interface Video {
  id: string
  order_id: string
  r2_url: string
  filename: string
  size?: number
  duration?: number
}

export interface Deliverable {
  id: string
  order_id: string
  editor_id: string
  r2_url: string
  clip_number: number
  virality_grade: ViralityGrade
  feedback: string
  delivered_at: string
}

export interface WhatsappLog {
  id: string
  user_id: string
  message: string
  status: 'enviado' | 'erro'
  created_at: string
}

export interface FollowupSequence {
  id: string
  user_id: string
  day_number: number
  message: string
  scheduled_at: string
  sent_at?: string
  status: 'pendente' | 'enviado' | 'erro'
}
