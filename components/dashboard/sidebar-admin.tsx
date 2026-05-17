'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Kanban, ScrollText, Users, Users2,
  DollarSign, Settings, Menu, X, LogOut, Zap, ChevronRight,
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
      className={`flex items-center gap-2.5 py-2 rounded-lg text-sm transition-all duration-150 group ${
        active
          ? 'bg-zinc-800/80 text-white font-medium border-l-2 border-violet-500 pl-[10px] pr-3'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-l-2 border-transparent pl-[10px] pr-3'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
      <span className="truncate flex-1">{item.label}</span>
      {active && <ChevronRight className="w-3 h-3 text-violet-500/60" />}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-3 mb-1.5">
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
      <div className="border-t border-zinc-800/60 px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors group cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Admin</p>
            <p className="text-zinc-500 text-[11px]">UPFY Mídia</p>
          </div>
          <button
            onClick={handleLogout}
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

export default function SidebarAdmin() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col bg-[#0D0D0F] border-r border-zinc-800/60 z-30">
        <SidebarContent />
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
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="ml-auto text-zinc-400 hover:text-white transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-14 left-0 bottom-0 w-64 bg-[#0D0D0F] border-r border-zinc-800/60 z-50">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
