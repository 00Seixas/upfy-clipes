'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { List, Play, CheckCircle, LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/fila', label: 'Fila', icon: List },
  { href: '/em-andamento', label: 'Em Andamento', icon: Play },
  { href: '/entregues', label: 'Entregues', icon: CheckCircle },
]

export default function SidebarEditor({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
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
          <img src="/logo.png" alt="UPFY" className="h-7" />
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
        <img src="/logo.png" alt="UPFY" className="h-6" />
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
