import { createClient } from '@/lib/supabase/server'
import { r2Client, R2_BUCKET } from '@/lib/r2/client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('r2_key, filename, orders!inner(client_id)')
    .eq('id', params.id)
    .single()

  if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify ownership
  const order = deliverable.orders as unknown as { client_id: string }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (order.client_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: deliverable.r2_key,
    ResponseContentDisposition: `attachment; filename="${deliverable.filename}"`,
  })

  const url = await getSignedUrl(r2Client, command, { expiresIn: 300 })
  return NextResponse.redirect(url)
}
