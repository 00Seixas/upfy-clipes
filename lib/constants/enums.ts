// ─── User & Org ──────────────────────────────────────────────────────────────

export const UserRole = {
  CLIENT: 'client',
  EDITOR: 'editor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const OrgType = {
  CLIENT: 'client',
  INTERNAL: 'internal',
} as const
export type OrgType = (typeof OrgType)[keyof typeof OrgType]

export const OrgStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CHURNED: 'churned',
} as const
export type OrgStatus = (typeof OrgStatus)[keyof typeof OrgStatus]

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
} as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export const AssetStatus = {
  UPLOADING: 'uploading',
  READY: 'ready',
  FAILED: 'failed',
  DELETED: 'deleted',
} as const
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus]

export const SubscriptionStatus = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  PAUSED: 'paused',
  MANUAL_ACTIVE: 'manual_active',
  MANUAL_CANCELED: 'manual_canceled',
} as const
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export const UsagePeriodStatus = {
  ACTIVE: 'active',
  EXHAUSTED: 'exhausted',
  EXPIRED: 'expired',
} as const
export type UsagePeriodStatus = (typeof UsagePeriodStatus)[keyof typeof UsagePeriodStatus]

// ─── Clip Requests ────────────────────────────────────────────────────────────

export const ClipRequestType = {
  SHORT_VIDEO: 'short_video',
  LONG_VIDEO: 'long_video',
  RECORDED_VIDEO: 'recorded_video',
  YOUTUBE_VIDEO: 'youtube_video',
} as const
export type ClipRequestType = (typeof ClipRequestType)[keyof typeof ClipRequestType]

export const ClipRequestStatus = {
  DRAFT: 'draft',
  PENDING_PAYMENT: 'pending_payment',
  PENDING_ANALYSIS: 'pending_analysis',
  QUEUED: 'queued',
  ASSIGNED: 'assigned',
  EDITING: 'editing',
  INTERNAL_REVIEW: 'internal_review',
  CHANGES_REQUESTED_BY_ADMIN: 'changes_requested_by_admin',
  READY_FOR_CLIENT: 'ready_for_client',
  REVISION_REQUESTED: 'revision_requested',
  APPROVED: 'approved',
  DELIVERED: 'delivered',
  PUBLISHED: 'published',
  CANCELED: 'canceled',
  FAILED: 'failed',
} as const
export type ClipRequestStatus = (typeof ClipRequestStatus)[keyof typeof ClipRequestStatus]

// ─── Billing ──────────────────────────────────────────────────────────────────

export const BillingMode = {
  CREDITS: 'credits',
  MONTHLY_QUOTA: 'monthly_quota',
  MANUAL_FREE: 'manual_free',
  ADMIN_OVERRIDE: 'admin_override',
} as const
export type BillingMode = (typeof BillingMode)[keyof typeof BillingMode]

export const CreditReason = {
  PURCHASE: 'purchase',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
  CLIP_REQUEST: 'clip_request',
  REFUND: 'refund',
  REVERSAL: 'reversal',
  ADMIN_BONUS: 'admin_bonus',
} as const
export type CreditReason = (typeof CreditReason)[keyof typeof CreditReason]

export const CreditDirection = {
  CREDIT: 'credit',
  DEBIT: 'debit',
} as const
export type CreditDirection = (typeof CreditDirection)[keyof typeof CreditDirection]

export const SubscriptionSource = {
  STRIPE: 'stripe',
  MANUAL: 'manual',
  OFFLINE: 'offline',
} as const
export type SubscriptionSource = (typeof SubscriptionSource)[keyof typeof SubscriptionSource]

// ─── CTA & Editing ───────────────────────────────────────────────────────────

export const CtaType = {
  NONE: 'none',
  DEFAULT: 'default',
  CUSTOM: 'custom',
  UPFY_SUGGESTS: 'upfy_suggests',
} as const
export type CtaType = (typeof CtaType)[keyof typeof CtaType]

// ─── Virality ─────────────────────────────────────────────────────────────────

export const ViralGrade = {
  FRIO: 'frio',
  MORNO: 'morno',
  QUENTE: 'quente',
  VIRAL: 'viral',
} as const
export type ViralGrade = (typeof ViralGrade)[keyof typeof ViralGrade]

// ─── Assets ──────────────────────────────────────────────────────────────────

export const AssetKind = {
  RAW_VIDEO: 'raw_video',
  FINAL_CLIP: 'final_clip',
  THUMBNAIL: 'thumbnail',
  TRANSCRIPT: 'transcript',
  PREVIEW: 'preview',
  OTHER: 'other',
} as const
export type AssetKind = (typeof AssetKind)[keyof typeof AssetKind]

// ─── Delivered Clips ──────────────────────────────────────────────────────────

export const DeliveredClipStatus = {
  INTERNAL_REVIEW: 'internal_review',
  READY_FOR_CLIENT: 'ready_for_client',
  REVISION_REQUESTED: 'revision_requested',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const
export type DeliveredClipStatus = (typeof DeliveredClipStatus)[keyof typeof DeliveredClipStatus]

export const RevisionStatus = {
  REQUESTED: 'requested',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const
export type RevisionStatus = (typeof RevisionStatus)[keyof typeof RevisionStatus]

export const AnalysisStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed',
} as const
export type AnalysisStatus = (typeof AnalysisStatus)[keyof typeof AnalysisStatus]

// ─── Social Platforms ─────────────────────────────────────────────────────────

export const Platform = {
  YOUTUBE: 'youtube',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
} as const
export type Platform = (typeof Platform)[keyof typeof Platform]

export const PostStatus = {
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus]

// ─── Notifications ────────────────────────────────────────────────────────────

export const NotificationChannel = {
  APP: 'app',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
} as const
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel]

export const NotificationStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  READ: 'read',
} as const
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus]

// ─── Webhooks & Audit ─────────────────────────────────────────────────────────

export const WebhookProvider = {
  STRIPE: 'stripe',
  YOUTUBE: 'youtube',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  OTHER: 'other',
} as const
export type WebhookProvider = (typeof WebhookProvider)[keyof typeof WebhookProvider]

export const AuditAction = {
  // Auth
  USER_SIGNED_IN: 'user.signed_in',
  USER_SIGNED_OUT: 'user.signed_out',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_BANNED: 'user.banned',
  // Org
  ORG_CREATED: 'org.created',
  ORG_UPDATED: 'org.updated',
  ORG_SUSPENDED: 'org.suspended',
  // Clip Requests
  CLIP_REQUEST_CREATED: 'clip_request.created',
  CLIP_REQUEST_SUBMITTED: 'clip_request.submitted',
  CLIP_REQUEST_CANCELED: 'clip_request.canceled',
  CLIP_REQUEST_ASSIGNED: 'clip_request.assigned',
  CLIP_REQUEST_STATUS_CHANGED: 'clip_request.status_changed',
  CLIP_REQUEST_APPROVED: 'clip_request.approved',
  CLIP_REQUEST_DELIVERED: 'clip_request.delivered',
  CLIP_REQUEST_PUBLISHED: 'clip_request.published',
  // Revisions
  REVISION_REQUESTED: 'revision.requested',
  REVISION_RESOLVED: 'revision.resolved',
  REVISION_REJECTED: 'revision.rejected',
  // Credits
  CREDITS_ADDED: 'credits.added',
  CREDITS_CONSUMED: 'credits.consumed',
  CREDITS_REFUNDED: 'credits.refunded',
  CREDITS_ADJUSTED: 'credits.adjusted',
  CREDITS_PURCHASED: 'credits.purchased',
  // Subscriptions
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_PAST_DUE: 'subscription.past_due',
  SUBSCRIPTION_MANUAL_CREATED: 'subscription.manual_created',
  // Uploads / Assets
  UPLOAD_INITIATED: 'upload.initiated',
  UPLOAD_COMPLETED: 'upload.completed',
  UPLOAD_FAILED: 'upload.failed',
  ASSET_DELETED: 'asset.deleted',
  // Views Vault
  VIEWS_VAULT_ANALYSIS_QUEUED: 'views_vault.analysis_queued',
  VIEWS_VAULT_ANALYSIS_COMPLETED: 'views_vault.analysis_completed',
  VIEWS_VAULT_OPPORTUNITY_REQUESTED: 'views_vault.opportunity_requested',
  // YouTube
  YOUTUBE_CHANNEL_CONNECTED: 'youtube.channel_connected',
  YOUTUBE_CHANNEL_DISCONNECTED: 'youtube.channel_disconnected',
  YOUTUBE_VIDEOS_SYNCED: 'youtube.videos_synced',
  // Social
  POST_SCHEDULED: 'post.scheduled',
  POST_PUBLISHED: 'post.published',
  POST_FAILED: 'post.failed',
  // Admin
  ADMIN_CLIENT_CREATED: 'admin.client_created',
  ADMIN_SUBSCRIPTION_CREATED: 'admin.subscription_created',
  ADMIN_CREDITS_ADJUSTED: 'admin.credits_adjusted',
} as const
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]

// ─── Opportunities ────────────────────────────────────────────────────────────

export const OpportunityStatus = {
  AVAILABLE: 'available',
  REQUESTED: 'requested',
  IGNORED: 'ignored',
} as const
export type OpportunityStatus = (typeof OpportunityStatus)[keyof typeof OpportunityStatus]

// ─── Business Constants ───────────────────────────────────────────────────────

export const CREDIT_COSTS = {
  short_video: 1800,
  long_video: 2500,
  recorded_video: 1800,
  youtube_video: 2500,
} as const satisfies Record<ClipRequestType, number>

export const VIRALITY_MULTIPLIERS: Record<ViralGrade, number> = {
  frio: 0.5,
  morno: 1,
  quente: 3,
  viral: 10,
}

export const VIRALITY_SCORE_RANGES: Record<ViralGrade, [number, number]> = {
  frio: [0, 39],
  morno: [40, 64],
  quente: [65, 84],
  viral: [85, 100],
}

// STATUS_TRANSITIONS: allowed next statuses per current status
// (role enforcement is done in service layer)
export const STATUS_TRANSITIONS: Record<ClipRequestStatus, ClipRequestStatus[]> = {
  draft: ['pending_payment', 'pending_analysis', 'canceled'],
  pending_payment: ['pending_analysis', 'canceled', 'failed'],
  pending_analysis: ['queued', 'canceled', 'failed'],
  queued: ['assigned', 'canceled'],
  assigned: ['editing', 'queued', 'canceled'],
  editing: ['internal_review', 'assigned', 'canceled'],
  internal_review: ['ready_for_client', 'changes_requested_by_admin'],
  changes_requested_by_admin: ['editing'],
  ready_for_client: ['approved', 'revision_requested'],
  revision_requested: ['editing'],
  approved: ['delivered'],
  delivered: ['published'],
  published: [],
  canceled: [],
  failed: [],
}

export const REVISION_WINDOW_HOURS = 48
export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB
export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
] as const

export const PLAN_IDS = {
  PRESENCA: 'presenca_monthly',
  CONSTANCIA: 'constancia_monthly',
  DOMINIO: 'dominio_monthly',
} as const
export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS]
