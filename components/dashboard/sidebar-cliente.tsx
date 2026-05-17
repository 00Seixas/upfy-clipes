'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Plus, Film, Archive, Clapperboard,
  CalendarDays, BarChart2, TrendingUp, Lightbulb,
  Library, CreditCard, Bell, Settings, LogOut,
  Menu, X, Zap, ChevronRight, Sparkles,
} from 'lucide-react'

const SECTIONS = [
  {
    label: null,
    items: [
      { href: '/inicio',        icon: LayoutDashboard, label: 'Dashboard'     },
      { href: '/enviar-videos', icon: Plus,            label: 'Pedir Clipe'   },
    ],
  },
  {
    label: 'PRODUÇÃO',
    items: [
      { href: '/producao',      icon: Clapperboard,    label: 'Produção'      },
      { href: '/meus-clipes',   icon: Film,            label: 'Meus Clipes'   },
      { href: '/cofre',         icon: Archive,         label: 'Cofre de Views', badge: '✦' },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { href: '/calendario',    icon: CalendarDays,    label: 'Agenda'        },
      { href: '/analytics',     icon: BarChart2,       label: 'Analytics'     },
      { href: '/ideias',        icon: Lightbulb,       label: 'Ideias'        },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { href: '/plano',         icon: CreditCard,      label: 'Plano',        comingSoon: true },
      { href: '/notificacoes',  icon: Bell,            label: 'Notificações', comingSoon: true },
      { href: '/configuracoes', icon: Settings,        label: 'Configurações', comingSoon: true },
    ],
  },
]

function NavItem({
  href, icon: Icon, label, badge, comingSoon, onClick,
}: {
  href: string; icon: React.ComponentType<{ className?: string }>
  label: string; badge?: string; comingSoon?: boolean; onClick?: () => void
}) {
  const pathname = usePathname()
  const active   = pathname === href || pathname.startsWith(href + '/')

  if (comingSoon) {
    return (
      <div className="flex items-center gap-2.5 py-2 border-l-2 border-transparent pl-[10px] pr-3 rounded-lg text-sm opacity-40 cursor-not-allowed">
        <Icon className="w-4 h-4 shrink-0 text-zinc-600" />
        <span className="flex-1 text-zinc-600">{label}</span>
        <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">em breve</span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 py-2 rounded-lg text-sm transition-all duration-150 group ${
        active
          ? 'bg-zinc-800/80 text-white font-medium border-l-2 border-violet-500 pl-[10px] pr-3'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-l-2 border-transparent pl-[10px] pr-3'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
      <span className="flex-1">{label}</span>
      {badge && !active && <span className="text-violet-400 text-xs">{badge}</span>}
      {active && <ChevronRight className="w-3 h-3 text-violet-500/60" />}
    </Link>
  )
}

function SidebarContent({ userName, planName, onClose }: {
  userName: string; planName?: string; onClose?: () => void
}) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-zinc-800/60">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="leading-none">
          <span className="text-white font-bold text-sm tracking-tight">UPFY</span>
          <span className="text-violet-400 font-bold text-sm tracking-tight"> CLIPES</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Plan badge */}
      <div className="px-4 py-2.5 border-b border-zinc-800/40">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70 bg-violet-950/30 border border-violet-900/30 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
          <Sparkles className="w-2.5 h-2.5" />
          {planName ?? 'Premium'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="text-[9px] font-bold tracking-widest text-zinc-700 px-3 mb-1 uppercase">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.href} {...item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer user */}
      <div className="border-t border-zinc-800/60 px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors group cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-violet-700/60 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(userName?.[0] ?? 'C').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{userName}</p>
            <p className="text-zinc-600 text-[11px]">Cliente</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SidebarCliente({ userName, planName }: { userName: string; planName?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col bg-[#0D0D0F] border-r border-zinc-800/60 z-30">
        <SidebarContent userName={userName} planName={planName} />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0D0D0F] border-b border-zinc-800/60 flex items-center px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight">
            UPFY<span className="text-violet-400"> CLIPES</span>
          </span>
        </div>
        <button onClick={() => setMobileOpen(o => !o)} className="ml-auto text-zinc-400 hover:text-white transition-colors">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed top-14 left-0 bottom-0 w-64 bg-[#0D0D0F] border-r border-zinc-800/60 z-50">
            <SidebarContent userName={userName} planName={planName} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
