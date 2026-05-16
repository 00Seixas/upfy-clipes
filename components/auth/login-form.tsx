'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function formatLoginIdentifier(input: string): string {
  const digitsOnly = input.replace(/\D/g, '')
  if (digitsOnly.length >= 10 && digitsOnly === input.replace(/[\s\-\(\)]/g, '')) {
    return `${digitsOnly}@clientes.upfy.internal`
  }
  return input
}

export default function LoginForm() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // DEMO MODE: aceita credenciais fixas sem Supabase
    const DEMO_USERS: Record<string, { password: string; redirect: string }> = {
      '14996134733': { password: 'Pedr@400', redirect: '/dashboard' },
      '14996134733@clientes.upfy.internal': { password: 'Pedr@400', redirect: '/dashboard' },
    }
    const identifierTrimmed = identifier.trim()
    const demo = DEMO_USERS[identifierTrimmed] ?? DEMO_USERS[formatLoginIdentifier(identifierTrimmed)]
    if (demo) {
      if (password === demo.password) {
        router.push(demo.redirect)
        return
      } else {
        setError('Senha incorreta.')
        setLoading(false)
        return
      }
    }

    const email = formatLoginIdentifier(identifierTrimmed)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Credenciais inválidas. Verifique seu WhatsApp/e-mail e senha.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier" className="text-zinc-300 text-sm">WhatsApp ou e-mail</Label>
        <Input
          id="identifier"
          type="text"
          placeholder="5511999999999 ou email@exemplo.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          className="bg-[#111113] border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-zinc-300 text-sm">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-[#111113] border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-3 py-2">{error}</p>
      )}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black hover:bg-zinc-100 font-medium"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
