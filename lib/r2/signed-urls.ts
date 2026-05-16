import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Client, R2_BUCKET } from './client'

/**
 * Builds a deterministic object key for R2 storage.
 */
export function getObjectKey(
  kind: string,
  orgId: string,
  requestId: string,
  assetId: string
): string {
  const prefixMap: Record<string, string> = {
    raw_video: 'raw-videos',
    final_clip: 'final-clips',
    thumbnail: 'thumbnails',
    transcript: 'transcripts',
    preview: 'previews',
    other: 'other',
  }
  const prefix = prefixMap[kind] ?? 'other'
  return `${prefix}/${orgId}/${requestId}/${assetId}`
}

/**
 * Creates a signed URL for uploading an object to R2.
 * Only allows PUT; content type is locked to prevent overriding.
 */
export async function createSignedUploadUrl(
  objectKey: string,
  mimeType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
    ContentType: mimeType,
  })
  return getSignedUrl(r2Client, command, { expiresIn })
}

/**
 * Creates a signed URL for downloading an object from R2.
 * Sets Content-Disposition to force download with the original filename.
 */
export async function createSignedDownloadUrl(
  objectKey: string,
  fileName: string,
  expiresIn = 900
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
  })
  return getSignedUrl(r2Client, command, { expiresIn })
}

/**
 * Deletes an object from R2.
 */
export async function deleteObject(objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
  })
  await r2Client.send(command)
}

/**
 * Checks whether an object exists in R2.
 */
export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
    })
    await r2Client.send(command)
    return true
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      '$metadata' in err &&
      (err as { $metadata: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
    ) {
      return false
    }
    throw err
  }
}

/**
 * Returns metadata for an object in R2 without downloading its content.
 */
export async function getObjectMetadata(objectKey: string): Promise<{
  contentLength?: number
  contentType?: string
  lastModified?: Date
}> {
  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
  })
  const result = await r2Client.send(command)
  return {
    contentLength: result.ContentLength,
    contentType: result.ContentType,
    lastModified: result.LastModified,
  }
}
