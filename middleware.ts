import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login']

const ROLE_HOME: Record<string, string> = {
  cliente: '/inicio',
  editor: '/fila',
  admin: '/dashboard',
}

function getRoleHome(role: string): string {
  return ROLE_HOME[role] ?? '/login'
}

function isClientePath(pathname: string): boolean {
  return (
    pathname.startsWith('/inicio') ||
    pathname.startsWith('/enviar-videos') ||
    pathname.startsWith('/meus-clipes') ||
    pathname.startsWith('/calendario')
  )
}

function isEditorPath(pathname: string): boolean {
  return pathname.startsWith('/fila') || pathname.startsWith('/em-andamento') || pathname.startsWith('/entregues')
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/kanban') || pathname.startsWith('/clientes') || pathname.startsWith('/editores')
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // Pass through static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api')
  ) {
    return res
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '?')
  )

  // DEMO MODE: sem Supabase configurado, permite acesso a tudo
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    if (pathname === '/') return NextResponse.redirect(new URL('/login', req.url))
    return res
  }

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2])
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated — redirect to login (except public paths)
  if (!user) {
    if (isPublic) return res
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Authenticated — fetch role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: string = profile?.role ?? 'cliente'
  const home = getRoleHome(role)

  // Authenticated user hitting login → redirect to their home
  if (isPublic) {
    return NextResponse.redirect(new URL(home, req.url))
  }

  // Block cross-role access
  if (isAdminPath(pathname) && role !== 'admin') {
    return NextResponse.redirect(new URL(home, req.url))
  }

  if (isEditorPath(pathname) && role !== 'editor' && role !== 'admin') {
    return NextResponse.redirect(new URL(home, req.url))
  }

  if (isClientePath(pathname) && role !== 'cliente' && role !== 'admin') {
    return NextResponse.redirect(new URL(home, req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
