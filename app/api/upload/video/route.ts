export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { r2Client, R2_BUCKET } from '@/lib/r2/client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType } = await req.json()

  const key = `uploads/${user.id}/${randomUUID()}/${filename}`

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })

  return NextResponse.json({ signedUrl, key })
}
