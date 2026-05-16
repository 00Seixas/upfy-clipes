import { requireRole } from '@/lib/auth/helpers'
import EnviarVideosClient from '@/components/upload/enviar-videos-client'

export default async function EnviarVideosPage() {
  await requireRole('cliente')
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Enviar Vídeos</h1>
      <p className="text-zinc-400 text-sm mb-8">Selecione os vídeos e preencha o briefing de cada um.</p>
      <EnviarVideosClient />
    </div>
  )
}
