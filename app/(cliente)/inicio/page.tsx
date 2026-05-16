export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Upload, Film, Clock, Calendar } from 'lucide-react'

export default async function InicioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const [{ data: profile }, { data: contract }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('client_contracts').select('*').eq('user_id', user.id).eq('status', 'ativo').single(),
    supabase.from('orders').select('status, deadline').eq('client_id', user.id).in('status', ['aguardando', 'em_edicao', 'aprovacao']),
  ])

  const clipsEntregues = contract?.clips_delivered ?? 0
  const clipsTotal = contract?.clips_total ?? 0
  const clipsRestantes = clipsTotal - clipsEntregues
  const emProducao = orders?.length ?? 0

  const proximaEntrega = orders
    ?.filter((o: { deadline?: string | null }) => o.deadline)
    .sort((a: { deadline: string }, b: { deadline: string }) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0]?.deadline

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Olá, {profile?.name?.split(' ')[0]}!</h1>
        <p className="text-zinc-500 text-sm mt-1">Bem-vindo à sua plataforma de clipes.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Film className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400 text-xs">Clipes entregues</span>
          </div>
          <p className="text-3xl font-semibold text-white">{clipsEntregues}</p>
          <p className="text-zinc-600 text-xs mt-1">de {clipsTotal} contratados</p>
        </div>

        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400 text-xs">Clipes restantes</span>
          </div>
          <p className="text-3xl font-semibold text-white">{clipsRestantes}</p>
          <p className="text-zinc-600 text-xs mt-1">no contrato atual</p>
        </div>

        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400 text-xs">Em produção</span>
          </div>
          <p className="text-3xl font-semibold text-white">{emProducao}</p>
          <p className="text-zinc-600 text-xs mt-1">pedidos ativos</p>
        </div>

        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400 text-xs">Próxima entrega</span>
          </div>
          <p className="text-xl font-semibold text-white">
            {proximaEntrega
              ? new Date(proximaEntrega).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              : '—'}
          </p>
          <p className="text-zinc-600 text-xs mt-1">prevista</p>
        </div>
      </div>

      <Link
        href="/enviar-videos"
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-white text-black font-medium text-sm rounded-lg hover:bg-zinc-100 transition-colors"
      >
        <Upload className="w-4 h-4" />
        Enviar vídeo agora
      </Link>
    </div>
  )
}
