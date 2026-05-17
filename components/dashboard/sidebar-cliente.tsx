'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Upload, Film, Calendar, LogOut, Menu, X, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/inicio', label: 'Início', icon: LayoutDashboard },
  { href: '/enviar-videos', label: 'Enviar Vídeos', icon: Upload },
  { href: '/meus-clipes', label: 'Meus Clipes', icon: Film },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
]

export default function SidebarCliente({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const NavLinks = () => (
    <>
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={() => setOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
            pathname.startsWith(href) ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </Link>
      ))}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-[#111113] border-r border-zinc-800 flex-col z-20">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <span className="text-white font-bold text-sm tracking-tight">UPFY</span>
              <span className="text-violet-400 font-bold text-sm tracking-tight"> CLIPES</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-zinc-800">
          <div className="px-3 py-1.5 mb-1">
            <p className="text-xs text-zinc-500 truncate">{userName}</p>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#111113] border-b border-zinc-800 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight">UPFY<span className="text-violet-400"> CLIPES</span></span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-zinc-400 hover:text-white">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile menu drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-10 bg-black/60" onClick={() => setOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-[#111113] border-b border-zinc-800 p-3 space-y-0.5" onClick={e => e.stopPropagation()}>
            <NavLinks />
            <button onClick={logout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 w-full transition-colors mt-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  )
}
