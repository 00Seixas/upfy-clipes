'use client'

import { useState } from 'react'
import { Users, Search, UserCheck, UserX, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Cliente {
  id: string
  full_name: string | null
  email: string
  created_at: string
  status: string | null
}

export default function AdminClientesClient({ clientes }: { clientes: Cliente[] }) {
  const [search, setSearch] = useState('')

  const filtered = clientes.filter(
    (c) =>
      (c.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1">{clientes.length} clientes cadastrados</p>
        </div>
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
                Cliente
              </th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide hidden md:table-cell">
                E-mail
              </th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide hidden lg:table-cell">
                Cadastro
              </th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-upfy-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-muted-foreground">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-upfy-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {(c.full_name ?? c.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{c.full_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {c.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'suspended' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                        <UserX className="h-3 w-3" />
                        Suspenso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        <UserCheck className="h-3 w-3" />
                        Ativo
                      </span>
                    )}
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
