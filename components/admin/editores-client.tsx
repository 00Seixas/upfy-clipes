'use client'

import { useState } from 'react'
import { Users, Search, UserCheck, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Editor {
  id: string
  full_name: string | null
  email: string
  created_at: string
  status: string | null
}

export default function AdminEditoresClient({ editores }: { editores: Editor[] }) {
  const [search, setSearch] = useState('')

  const filtered = editores.filter(
    (e) =>
      (e.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Editores
          </h1>
          <p className="text-muted-foreground mt-1">{editores.length} editores cadastrados</p>
        </div>
        <Button size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Convidar editor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="pl-9 bg-upfy-surface border-upfy-border"
        />
      </div>

      <div className="rounded-xl border border-upfy-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-upfy-border bg-upfy-surface">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Editor
              </th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide hidden md:table-cell">
                E-mail
              </th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-upfy-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-10 text-muted-foreground">
                  {editores.length === 0
                    ? 'Nenhum editor cadastrado ainda. Convide o primeiro!'
                    : 'Nenhum editor encontrado'}
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="hover:bg-upfy-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-secondary">
                          {(e.full_name ?? e.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{e.full_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {e.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      <UserCheck className="h-3 w-3" />
                      Ativo
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
