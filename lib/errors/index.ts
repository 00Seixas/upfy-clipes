// ─── Base Error ───────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.details = details
    // Restore prototype chain for instanceof checks in transpiled JS
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ─── HTTP-specific errors ─────────────────────────────────────────────────────

export class AuthError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, 'AUTH_REQUIRED', 401, details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', details?: unknown) {
    super(message, 'FORBIDDEN', 403, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 'NOT_FOUND', 404, details)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, 'CONFLICT', 409, details)
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment error', details?: unknown) {
    super(message, 'PAYMENT_ERROR', 402, details)
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(message = 'Insufficient credits', details?: unknown) {
    super(message, 'INSUFFICIENT_CREDITS', 402, details)
  }
}

export class QuotaExhaustedError extends AppError {
  constructor(message = 'Monthly quota exhausted', details?: unknown) {
    super(message, 'QUOTA_EXHAUSTED', 402, details)
  }
}

export class UploadError extends AppError {
  constructor(message = 'Upload failed', details?: unknown) {
    super(message, 'UPLOAD_ERROR', 400, details)
  }
}

export class WebhookError extends AppError {
  constructor(message = 'Webhook processing failed', details?: unknown) {
    super(message, 'WEBHOOK_ERROR', 400, details)
  }
}

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}

// ─── Safe serialisation ───────────────────────────────────────────────────────

/**
 * Converts any error into a safe, user-facing API error payload.
 * Never leaks stack traces; logs internally with full detail.
 */
export function toApiError(err: unknown): {
  message: string
  code: string
  statusCode: number
} {
  if (isAppError(err)) {
    // Log with detail but don't expose internals
    console.error(`[AppError] ${err.code} (${err.statusCode}):`, err.message, err.details ?? '')
    return {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
    }
  }

  // Unknown/unexpected error — log the full error, return a generic message
  console.error('[UnhandledError]', err)
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500,
  }
}
