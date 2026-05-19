'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Kanban, ScrollText, Users, Users2,
  DollarSign, Settings, Menu, X, LogOut, ChevronRight, CheckCircle,
  Inbox, Play, Timer,
} from 'lucide-react'

interface NavItem {
  href:  string
  icon:  React.ComponentType<{ className?: string }>
  label: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operações',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'        },
      { href: '/kanban',    icon: Kanban,           label: 'Fila Operacional' },
      { href: '/aprovacao', icon: CheckCircle,      label: 'Aprovação'        },
      { href: '/logs',      icon: ScrollText,        label: 'Logs'             },
    ],
  },
  {
    title: 'Pessoas',
    items: [
      { href: '/clientes',  icon: Users,  label: 'Clientes' },
      { href: '/editores',  icon: Users2, label: 'Editores' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { href: '/financeiro', icon: DollarSign, label: 'Financeiro' },
    ],
  },
  {
    title: 'Studio',
    items: [
      { href: '/fila',         icon: Inbox, label: 'Fila de Jobs'  },
      { href: '/em-andamento', icon: Play,  label: 'Em Andamento'  },
      { href: '/sla',          icon: Timer, label: 'SLA Monitor'   },
    ],
  },
  {
    title: 'Config',
    items: [
      { href: '/configuracoes', icon: Settings, label: 'Configurações' },
    ],
  },
]

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname()
  const active   = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  const Icon     = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative ${
        active
          ? 'bg-white/[0.07] text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-white/50 rounded-full" />
      )}
      <Icon className={`w-[15px] h-[15px] shrink-0 transition-colors ${
        active ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'
      }`} />
      <span className="flex-1 font-medium truncate">{item.label}</span>
      {active && <ChevronRight className="w-3 h-3 text-zinc-600" />}
    </Link>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="text-white font-black text-sm tracking-tight">UPFY</span>
        <span className="text-zinc-700 font-black text-sm tracking-tight">CLIPES</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded">
            Admin
          </span>
          {onClose && (
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-[9px] font-bold tracking-[0.18em] text-zinc-800 px-3 mb-1 uppercase select-none">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.04]">
        <div className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-300 text-xs font-medium truncate">Admin</p>
            <p className="text-zinc-700 text-[10px]">UPFY Mídia</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SidebarAdmin() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col bg-[#080809] border-r border-white/[0.04] z-30">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#080809]/90 backdrop-blur-xl border-b border-white/[0.04] flex items-center px-4 z-30">
        <span className="text-white font-black text-sm tracking-tight">
          UPFY <span className="text-zinc-700">CLIPES</span>
        </span>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="ml-auto text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-14 left-0 bottom-0 w-64 bg-[#080809] border-r border-white/[0.04] z-50">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
