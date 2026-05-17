import { createClient } from '@/lib/supabase/server'
import { r2Client, R2_BUCKET } from '@/lib/r2/client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'editor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('r2_key, filename')
    .eq('id', params.id)
    .single()

  if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: deliverable.r2_key,
  })

  const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
  return NextResponse.json({ url })
}
