import { createServiceClient } from '@/lib/supabase/server'
import type { OperationalLog } from '@/types/domain'

interface LogActionParams {
  actorId?:    string | null
  actorName?:  string | null
  actorRole?:  string | null
  action:      string
  entityType:  string
  entityId?:   string | null
  beforeData?: Record<string, unknown> | null
  afterData?:  Record<string, unknown> | null
  metadata?:   Record<string, unknown>
  ipAddress?:  string | null
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('operational_logs').insert({
      actor_id:    params.actorId    ?? null,
      actor_name:  params.actorName  ?? null,
      actor_role:  params.actorRole  ?? null,
      action:      params.action,
      entity_type: params.entityType,
      entity_id:   params.entityId   ?? null,
      before_data: params.beforeData ?? null,
      after_data:  params.afterData  ?? null,
      metadata:    params.metadata   ?? {},
      ip_address:  params.ipAddress  ?? null,
    })
  } catch (err) {
    // Audit logs must never break the main flow
    console.error('[audit] logAction failed:', err)
  }
}

export async function logOrderAction(params: {
  actorId:   string
  actorName: string
  actorRole: string
  orderId:   string
  action:    string
  before?:   unknown
  after?:    unknown
  metadata?: Record<string, unknown>
}): Promise<void> {
  await logAction({
    actorId:    params.actorId,
    actorName:  params.actorName,
    actorRole:  params.actorRole,
    action:     params.action,
    entityType: 'order',
    entityId:   params.orderId,
    beforeData: params.before as Record<string, unknown> | null,
    afterData:  params.after  as Record<string, unknown> | null,
    metadata:   params.metadata,
  })
}

export async function logEditorAction(params: {
  actorId:   string
  actorName: string
  actorRole: string
  editorId:  string
  action:    string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await logAction({
    actorId:    params.actorId,
    actorName:  params.actorName,
    actorRole:  params.actorRole,
    action:     params.action,
    entityType: 'editor',
    entityId:   params.editorId,
    metadata:   params.metadata,
  })
}

export async function logPayoutAction(params: {
  actorId:   string
  actorName: string
  actorRole: string
  payoutId:  string
  action:    string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await logAction({
    actorId:    params.actorId,
    actorName:  params.actorName,
    actorRole:  params.actorRole,
    action:     params.action,
    entityType: 'payout',
    entityId:   params.payoutId,
    metadata:   params.metadata,
  })
}

interface FetchLogsParams {
  entityType?: string
  entityId?:   string
  actorId?:    string
  action?:     string
  limit?:      number
  offset?:     number
  startDate?:  string
  endDate?:    string
}

export async function fetchLogs(
  params: FetchLogsParams = {}
): Promise<{ logs: OperationalLog[]; total: number }> {
  const supabase = createServiceClient()
  const { limit = 50, offset = 0 } = params

  let query = supabase
    .from('operational_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params.entityType) query = query.eq('entity_type', params.entityType)
  if (params.entityId)   query = query.eq('entity_id', params.entityId)
  if (params.actorId)    query = query.eq('actor_id', params.actorId)
  if (params.action)     query = query.ilike('action', `%${params.action}%`)
  if (params.startDate)  query = query.gte('created_at', params.startDate)
  if (params.endDate)    query = query.lte('created_at', params.endDate)

  const { data, count, error } = await query

  if (error) {
    console.error('[audit] fetchLogs error:', error)
    return { logs: [], total: 0 }
  }

  return {
    logs:  (data ?? []) as OperationalLog[],
    total: count ?? 0,
  }
}
