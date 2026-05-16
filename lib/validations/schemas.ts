import { z } from 'zod'
import { PLAN_IDS } from '@/lib/constants/enums'

// ─── Clip Requests ────────────────────────────────────────────────────────────

export const createClipRequestSchema = z.object({
  type: z.enum(['short_video', 'long_video', 'recorded_video', 'youtube_video']),
  billingMode: z.enum(['credits', 'monthly_quota', 'manual_free', 'admin_override']),
  title: z.string().min(1).max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  rawVideoUrl: z.string().url().optional().nullable(),
  youtubeVideoId: z.string().max(20).optional().nullable(),
  youtubeVideoUrl: z.string().url().optional().nullable(),
  clipsRequested: z.number().int().min(1).max(20).optional().default(1),
  editingStyleId: z.string().uuid().optional().nullable(),
  ctaType: z.enum(['none', 'default', 'custom', 'upfy_suggests']).optional().default('default'),
  ctaText: z.string().max(150).optional().nullable(),
  editorNotes: z.string().max(1000).optional().nullable(),
  clientNotes: z.string().max(1000).optional().nullable(),
  relatedOpportunityId: z.string().uuid().optional().nullable(),
  relatedVideoRankingId: z.string().uuid().optional().nullable(),
})

export type CreateClipRequestInput = z.infer<typeof createClipRequestSchema>

export const submitClipRequestSchema = z.object({
  clipRequestId: z.string().uuid(),
})

export type SubmitClipRequestInput = z.infer<typeof submitClipRequestSchema>

// ─── Uploads ─────────────────────────────────────────────────────────────────

export const uploadInitSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']),
  sizeBytes: z.number().int().min(1).max(2 * 1024 * 1024 * 1024), // max 2 GB
  clipRequestId: z.string().uuid().optional().nullable(),
  kind: z.enum(['raw_video', 'final_clip', 'thumbnail', 'transcript', 'preview', 'other']),
})

export type UploadInitInput = z.infer<typeof uploadInitSchema>

export const uploadCompleteSchema = z.object({
  assetId: z.string().uuid(),
  checksum: z.string().optional().nullable(),
})

export type UploadCompleteInput = z.infer<typeof uploadCompleteSchema>

// ─── Status transitions ───────────────────────────────────────────────────────

export const updateClipRequestStatusSchema = z.object({
  status: z.enum([
    'draft', 'pending_payment', 'pending_analysis', 'queued', 'assigned',
    'editing', 'internal_review', 'changes_requested_by_admin',
    'ready_for_client', 'revision_requested', 'approved', 'delivered',
    'published', 'canceled', 'failed',
  ]),
  message: z.string().max(500).optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
})

export type UpdateClipRequestStatusInput = z.infer<typeof updateClipRequestStatusSchema>

// ─── Revisions ────────────────────────────────────────────────────────────────

export const requestRevisionSchema = z.object({
  message: z.string().min(10, 'Revision message must be at least 10 characters').max(500),
})

export type RequestRevisionInput = z.infer<typeof requestRevisionSchema>

export const approveClipSchema = z.object({
  deliveredClipId: z.string().uuid(),
})

export type ApproveClipInput = z.infer<typeof approveClipSchema>

// ─── Stripe / Billing ─────────────────────────────────────────────────────────

export const createCheckoutSessionSchema = z.object({
  planId: z.enum([
    PLAN_IDS.PRESENCA,
    PLAN_IDS.CONSTANCIA,
    PLAN_IDS.DOMINIO,
  ] as [string, ...string[]]),
})

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminAdjustCreditsSchema = z.object({
  organizationId: z.string().uuid(),
  amount: z.number().int().min(1, 'Amount must be a positive integer'),
  direction: z.enum(['credit', 'debit']),
  reason: z.enum(['purchase', 'manual_adjustment', 'clip_request', 'refund', 'reversal', 'admin_bonus']),
  note: z.string().max(500).optional().nullable(),
})

export type AdminAdjustCreditsInput = z.infer<typeof adminAdjustCreditsSchema>

export const manualSubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  planId: z.enum([
    PLAN_IDS.PRESENCA,
    PLAN_IDS.CONSTANCIA,
    PLAN_IDS.DOMINIO,
  ] as [string, ...string[]]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  source: z.enum(['manual', 'offline']),
  videosPerMonth: z.number().int().min(1).optional().nullable(),
})

export type ManualSubscriptionInput = z.infer<typeof manualSubscriptionSchema>

// ─── Views Vault ──────────────────────────────────────────────────────────────

export const viewsVaultAnalysisSchema = z.object({
  // Reserved for future filters/options
  forceRefresh: z.boolean().optional().default(false),
})

export type ViewsVaultAnalysisInput = z.infer<typeof viewsVaultAnalysisSchema>

// ─── Social Scheduling ────────────────────────────────────────────────────────

export const schedulePostSchema = z.object({
  deliveredClipId: z.string().uuid(),
  platform: z.enum(['youtube', 'instagram', 'tiktok']),
  scheduledFor: z
    .string()
    .datetime()
    .refine(
      (val) => new Date(val) > new Date(),
      'Scheduled time must be in the future'
    ),
  caption: z.string().max(2200).optional().nullable(),
  hashtags: z.array(z.string().max(100)).max(30).optional().default([]),
})

export type SchedulePostInput = z.infer<typeof schedulePostSchema>

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>

// ─── Assignment ───────────────────────────────────────────────────────────────

export const assignEditorSchema = z.object({
  editorId: z.string().uuid(),
})

export type AssignEditorInput = z.infer<typeof assignEditorSchema>

export const requestChangesSchema = z.object({
  message: z.string().min(10).max(500),
})

export type RequestChangesInput = z.infer<typeof requestChangesSchema>
