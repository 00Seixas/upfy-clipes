import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fetchLogs } from '@/lib/services/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const { logs, total } = await fetchLogs({
    entityType: searchParams.get('entityType')  || undefined,
    entityId:   searchParams.get('entityId')    || undefined,
    actorId:    searchParams.get('actorId')     || undefined,
    action:     searchParams.get('action')      || undefined,
    startDate:  searchParams.get('startDate')   || undefined,
    endDate:    searchParams.get('endDate')     || undefined,
    limit:      Number(searchParams.get('limit') ?? 50),
    offset:     Number(searchParams.get('offset') ?? 0),
  })

  return NextResponse.json({ logs, total })
}
