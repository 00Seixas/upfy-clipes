import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET() {
  const supabase = createServiceClient()
  const { data: editors } = await supabase
    .from('profiles')
    .select('id, name, email, created_at')
    .eq('role', 'editor')
    .order('created_at', { ascending: false })

  // Get clip counts per editor
  const editorIds = (editors ?? []).map((e: { id: string }) => e.id)
  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('editor_id')
    .in('editor_id', editorIds)

  const clipCounts: Record<string, number> = {}
  for (const d of deliverables ?? []) {
    clipCounts[d.editor_id] = (clipCounts[d.editor_id] ?? 0) + 1
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: monthDeliverables } = await supabase
    .from('deliverables')
    .select('editor_id')
    .in('editor_id', editorIds)
    .gte('delivered_at', startOfMonth)

  const monthCounts: Record<string, number> = {}
  for (const d of monthDeliverables ?? []) {
    monthCounts[d.editor_id] = (monthCounts[d.editor_id] ?? 0) + 1
  }

  return NextResponse.json({
    editors: (editors ?? []).map((e: { id: string; name: string; email: string; created_at: string }) => ({
      ...e,
      total_clips: clipCounts[e.id] ?? 0,
      month_clips: monthCounts[e.id] ?? 0,
    }))
  })
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { name, email, password: customPassword } = await req.json()

  const password = customPassword?.trim() || generatePassword()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role: 'editor' },
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar editor' }, { status: 400 })
  }

  await supabase.from('profiles').update({ name, role: 'editor' }).eq('id', authData.user.id)

  // Create editor invite token
  await supabase
    .from('editor_invites')
    .insert({ editor_id: authData.user.id })
    .select('token')
    .single()

  // Send welcome email via Resend
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@upfymidia.com',
      to: email,
      subject: 'Bem-vindo à plataforma UPFY Clipes',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0A0A0B; color: #fff; padding: 32px; border-radius: 12px;">
          <h1 style="font-size: 20px; margin-bottom: 8px;">Olá, ${name}!</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">Sua conta de editor foi criada na plataforma UPFY Clipes.</p>
          <div style="background: #111113; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 4px;">E-mail de acesso</p>
            <p style="font-size: 14px; color: #fff; margin: 0; font-weight: 500;">${email}</p>
            <p style="font-size: 13px; color: #a1a1aa; margin: 16px 0 4px;">Senha temporária</p>
            <p style="font-size: 14px; color: #fff; margin: 0; font-weight: 500; font-family: monospace;">${password}</p>
          </div>
          <a href="${appUrl}/login" style="display: inline-block; background: #fff; color: #000; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
            Acessar plataforma
          </a>
          <p style="color: #52525b; font-size: 12px; margin-top: 24px;">Recomendamos trocar sua senha após o primeiro acesso.</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Failed to send welcome email:', err)
  }

  return NextResponse.json({ ok: true, editor: { id: authData.user.id, name, email } })
}
