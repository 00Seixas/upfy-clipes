export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { r2Client, R2_BUCKET } from '@/lib/r2/client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawFilename = req.headers.get('x-filename') ?? 'video.mp4'
  const filename = decodeURIComponent(rawFilename)
  const contentType = req.headers.get('x-content-type') ?? 'video/mp4'

  const buffer = Buffer.from(await req.arrayBuffer())
  if (!buffer.length) return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 })

  console.log('[r2] uploading', filename, buffer.length, 'bytes')

  const key = `uploads/${user.id}/${randomUUID()}/${filename}`

  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))

  console.log('[r2] upload ok:', key)
  return NextResponse.json({ key, filename })
}
