'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Inbox, Play, CheckCircle, Wallet, LogOut, Menu, X, ChevronRight, BarChart2 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/fila',           icon: Inbox,       label: 'Fila de Pedidos' },
  { href: '/em-andamento',   icon: Play,        label: 'Em Andamento'    },
  { href: '/entregues',      icon: CheckCircle, label: 'Entregues'       },
  { href: '/carteira',       icon: Wallet,      label: 'Carteira'        },
  { href: '/meu-desempenho', icon: BarChart2,   label: 'Meu Desempenho'  },
]

function NavLink({
  href, label, icon: Icon, onClick,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
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
      <Icon
        className={`w-[15px] h-[15px] shrink-0 transition-colors ${
          active ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'
        }`}
      />
      <span className="flex-1 font-medium">{label}</span>
      {active && <ChevronRight className="w-3 h-3 text-zinc-600" />}
    </Link>
  )
}

function SidebarContent({ userName, onClose }: { userName: string; onClose?: () => void }) {
  const router = useRouter()

  async function logout() {
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
            Editor
          </span>
          {onClose && (
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} {...item} onClick={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.04]">
        <div className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0">
            {(userName?.[0] ?? 'E').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-300 text-xs font-medium truncate">{userName}</p>
            <p className="text-zinc-700 text-[10px]">Editor</p>
          </div>
          <button
            onClick={logout}
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

export default function SidebarEditor({ userName }: { userName: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col bg-[#080809] border-r border-white/[0.04] z-30">
        <SidebarContent userName={userName} />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#080809]/90 backdrop-blur-xl border-b border-white/[0.04] flex items-center px-4 z-30">
        <span className="text-white font-black text-sm tracking-tight">
          UPFY <span className="text-zinc-700">CLIPES</span>
        </span>
        <button
          onClick={() => setMobileOpen(o => !o)}
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
            <SidebarContent userName={userName} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
