'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Columns, Users, UserCheck, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kanban', label: 'Kanban', icon: Columns },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/editores', label: 'Editores', icon: UserCheck },
]

export default function SidebarAdmin({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#111113] border-r border-zinc-800 flex flex-col z-20">
      <div className="p-4 border-b border-zinc-800">
        <img src="/logo.png" alt="UPFY" className="h-7" />
        <span className="text-xs text-zinc-600 mt-1 block">Admin</span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              pathname.startsWith(href) ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
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
  )
}
