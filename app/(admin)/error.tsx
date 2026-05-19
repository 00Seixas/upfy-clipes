'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Admin Error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-[#080809] border border-red-500/20 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/[0.06] border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <h2 className="text-white font-semibold text-base mb-1">Algo deu errado</h2>
        <p className="text-zinc-500 text-sm mb-2">{error.message}</p>
        {error.digest && <p className="text-zinc-700 text-xs mb-5 font-mono">#{error.digest}</p>}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/[0.15] transition-all text-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    </div>
  )
}
