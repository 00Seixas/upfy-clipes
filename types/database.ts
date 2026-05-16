// ─── Shared primitives ────────────────────────────────────────────────────────

type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── profiles ─────────────────────────────────────────────────────────────────
// One row per auth user. Clients log in with whatsapp as their identifier,
// stored as <whatsapp>@clientes.upfy.internal in Supabase Auth.

export interface ProfileRow {
  id: string
  name: string
  email: string | null
  whatsapp: string | null
  role: 'cliente' | 'editor' | 'admin'
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  name: string
  email?: string | null
  whatsapp?: string | null
  role?: 'cliente' | 'editor' | 'admin'
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  name?: string
  email?: string | null
  whatsapp?: string | null
  role?: 'cliente' | 'editor' | 'admin'
  updated_at?: string
}

// ─── client_contracts ─────────────────────────────────────────────────────────

export interface ClientContractRow {
  id: string
  user_id: string
  clips_total: number
  clips_delivered: number
  start_date: string
  end_date: string
  payment_link: string | null
  notes: string | null
  status: 'ativo' | 'encerrando' | 'aguardando_renovacao' | 'encerrado'
  created_at: string
  updated_at: string
}

export interface ClientContractInsert {
  id?: string
  user_id: string
  clips_total: number
  clips_delivered?: number
  start_date: string
  end_date: string
  payment_link?: string | null
  notes?: string | null
  status?: 'ativo' | 'encerrando' | 'aguardando_renovacao' | 'encerrado'
  created_at?: string
  updated_at?: string
}

export interface ClientContractUpdate {
  clips_total?: number
  clips_delivered?: number
  start_date?: string
  end_date?: string
  payment_link?: string | null
  notes?: string | null
  status?: 'ativo' | 'encerrando' | 'aguardando_renovacao' | 'encerrado'
  updated_at?: string
}

// ─── orders ───────────────────────────────────────────────────────────────────

export interface OrderRow {
  id: string
  client_id: string
  editor_id: string | null
  status: 'aguardando' | 'em_edicao' | 'aprovacao' | 'entregue'
  briefing: Json  // matches Briefing interface from types/index.ts
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface OrderInsert {
  id?: string
  client_id: string
  editor_id?: string | null
  status?: 'aguardando' | 'em_edicao' | 'aprovacao' | 'entregue'
  briefing: Json
  deadline?: string | null
  created_at?: string
  updated_at?: string
}

export interface OrderUpdate {
  editor_id?: string | null
  status?: 'aguardando' | 'em_edicao' | 'aprovacao' | 'entregue'
  briefing?: Json
  deadline?: string | null
  updated_at?: string
}

// ─── videos ───────────────────────────────────────────────────────────────────
// Raw videos uploaded by clients

export interface VideoRow {
  id: string
  order_id: string
  r2_key: string        // object key in R2 (never exposed directly)
  r2_url: string        // public or signed URL
  filename: string
  size: number | null
  duration: number | null
  created_at: string
}

export interface VideoInsert {
  id?: string
  order_id: string
  r2_key: string
  r2_url: string
  filename: string
  size?: number | null
  duration?: number | null
  created_at?: string
}

export interface VideoUpdate {
  r2_url?: string
  filename?: string
  size?: number | null
  duration?: number | null
}

// ─── deliverables ─────────────────────────────────────────────────────────────
// Finished clips uploaded by editors

export interface DeliverableRow {
  id: string
  order_id: string
  editor_id: string
  r2_key: string        // object key in R2
  r2_url: string
  clip_number: number
  virality_grade: 'frio' | 'morno' | 'quente' | 'viral'
  feedback: string
  approved: boolean
  approved_at: string | null
  delivered_at: string
  created_at: string
}

export interface DeliverableInsert {
  id?: string
  order_id: string
  editor_id: string
  r2_key: string
  r2_url: string
  clip_number: number
  virality_grade: 'frio' | 'morno' | 'quente' | 'viral'
  feedback: string
  approved?: boolean
  approved_at?: string | null
  delivered_at?: string
  created_at?: string
}

export interface DeliverableUpdate {
  r2_url?: string
  virality_grade?: 'frio' | 'morno' | 'quente' | 'viral'
  feedback?: string
  approved?: boolean
  approved_at?: string | null
}

// ─── whatsapp_logs ────────────────────────────────────────────────────────────

export interface WhatsappLogRow {
  id: string
  user_id: string
  phone: string
  message: string
  status: 'enviado' | 'erro'
  error_message: string | null
  created_at: string
}

export interface WhatsappLogInsert {
  id?: string
  user_id: string
  phone: string
  message: string
  status?: 'enviado' | 'erro'
  error_message?: string | null
  created_at?: string
}

export interface WhatsappLogUpdate {
  status?: 'enviado' | 'erro'
  error_message?: string | null
}

// ─── followup_sequences ───────────────────────────────────────────────────────

export interface FollowupSequenceRow {
  id: string
  user_id: string
  day_number: number
  message: string
  scheduled_at: string
  sent_at: string | null
  status: 'pendente' | 'enviado' | 'erro'
  created_at: string
}

export interface FollowupSequenceInsert {
  id?: string
  user_id: string
  day_number: number
  message: string
  scheduled_at: string
  sent_at?: string | null
  status?: 'pendente' | 'enviado' | 'erro'
  created_at?: string
}

export interface FollowupSequenceUpdate {
  sent_at?: string | null
  status?: 'pendente' | 'enviado' | 'erro'
}

// ─── Database interface ───────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      client_contracts: {
        Row: ClientContractRow
        Insert: ClientContractInsert
        Update: ClientContractUpdate
      }
      orders: {
        Row: OrderRow
        Insert: OrderInsert
        Update: OrderUpdate
      }
      videos: {
        Row: VideoRow
        Insert: VideoInsert
        Update: VideoUpdate
      }
      deliverables: {
        Row: DeliverableRow
        Insert: DeliverableInsert
        Update: DeliverableUpdate
      }
      whatsapp_logs: {
        Row: WhatsappLogRow
        Insert: WhatsappLogInsert
        Update: WhatsappLogUpdate
      }
      followup_sequences: {
        Row: FollowupSequenceRow
        Insert: FollowupSequenceInsert
        Update: FollowupSequenceUpdate
      }
    }
    Functions: {
      current_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_editor: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}
