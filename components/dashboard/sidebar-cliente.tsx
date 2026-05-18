'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Plus, Film, Archive, Clapperboard,
  CalendarDays, BarChart2, Lightbulb,
  CreditCard, Bell, Settings, LogOut,
  Menu, X, Youtube, ChevronRight,
} from 'lucide-react'

const SECTIONS = [
  {
    label: null,
    items: [
      { href: '/inicio',        icon: LayoutDashboard, label: 'Dashboard'      },
      { href: '/enviar-videos', icon: Plus,            label: 'Pedir Clipe'    },
    ],
  },
  {
    label: 'PRODUÇÃO',
    items: [
      { href: '/producao',    icon: Clapperboard, label: 'Produção'        },
      { href: '/meus-clipes', icon: Film,         label: 'Meus Clipes'     },
      { href: '/meu-youtube', icon: Youtube,      label: 'Meu YouTube'     },
      { href: '/cofre',       icon: Archive,      label: 'Cofre de Views'  },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { href: '/calendario', icon: CalendarDays, label: 'Agenda'    },
      { href: '/analytics',  icon: BarChart2,    label: 'Analytics' },
      { href: '/ideias',     icon: Lightbulb,    label: 'Ideias'    },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { href: '/plano',         icon: CreditCard, label: 'Plano',         comingSoon: true },
      { href: '/notificacoes',  icon: Bell,       label: 'Notificações',  comingSoon: true },
      { href: '/configuracoes', icon: Settings,   label: 'Configurações', comingSoon: true },
    ],
  },
]

function NavItem({
  href, icon: Icon, label, comingSoon, onClick,
}: {
  href: string; icon: React.ComponentType<{ className?: string }>
  label: string; comingSoon?: boolean; onClick?: () => void
}) {
  const pathname = usePathname()
  const active   = pathname === href || pathname.startsWith(href + '/')

  if (comingSoon) {
    return (
      <div className="flex items-center gap-2.5 py-2 pl-3 pr-3 rounded-lg text-sm opacity-30 cursor-not-allowed">
        <Icon className="w-4 h-4 shrink-0 text-[#4A4A54]" />
        <span className="flex-1 text-[#4A4A54]">{label}</span>
        <span className="text-[9px] text-[#4A4A54] bg-[#0E0E11] px-1.5 py-0.5 rounded border border-[#1A1A1F]">em breve</span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 py-2 rounded-lg text-sm transition-all duration-150 group pl-3 pr-3 ${
        active
          ? 'bg-[rgba(255,255,255,0.07)] text-[#F0F0F2] font-medium'
          : 'text-[#7A7A8A] hover:text-[#F0F0F2] hover:bg-[#0E0E11]'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#F0F0F2]' : 'text-[#4A4A54] group-hover:text-[#7A7A8A]'}`} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="w-3 h-3 text-[#4A4A54]" />}
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
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1A1A1F]">
        <div className="leading-none flex items-center gap-2">
          <span className="text-[#F0F0F2] font-black text-sm tracking-tight">UPFY</span>
          <span className="text-[#4A4A54] font-black text-sm tracking-tight">CLIPES</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-[#4A4A54] hover:text-[#F0F0F2] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Plan badge */}
      <div className="px-4 py-2.5 border-b border-[#1A1A1F]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A54] bg-[#0E0E11] border border-[#1A1A1F] px-2 py-0.5 rounded w-fit flex items-center gap-1">
          {planName ?? 'Premium'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="text-[9px] font-bold tracking-widest text-[#252530] px-3 mb-1 uppercase">
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
      <div className="border-t border-[#1A1A1F] px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#0E0E11] transition-colors group cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-[#141418] border border-[#1A1A1F] flex items-center justify-center text-[#F0F0F2] text-xs font-bold shrink-0">
            {(userName?.[0] ?? 'C').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#F0F0F2] text-xs font-medium truncate">{userName}</p>
            <p className="text-[#4A4A54] text-[11px]">Cliente</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="text-[#4A4A54] hover:text-[#F0F0F2] transition-colors opacity-0 group-hover:opacity-100"
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
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col bg-[#08080A] border-r border-[#1A1A1F] z-30">
        <SidebarContent userName={userName} planName={planName} />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#08080A] border-b border-[#1A1A1F] flex items-center px-4 z-30">
        <span className="text-[#F0F0F2] font-black text-sm tracking-tight">
          UPFY <span className="text-[#4A4A54]">CLIPES</span>
        </span>
        <button onClick={() => setMobileOpen(o => !o)} className="ml-auto text-[#4A4A54] hover:text-[#F0F0F2] transition-colors">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/75 z-40" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed top-14 left-0 bottom-0 w-64 bg-[#08080A] border-r border-[#1A1A1F] z-50">
            <SidebarContent userName={userName} planName={planName} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
