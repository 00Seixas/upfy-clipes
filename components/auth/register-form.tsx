'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { CREDIT_PACKAGES } from '@/lib/constants'

interface RegisterFormProps {
  packageId?: string
  sessionId?: string
}

export default function RegisterForm({ packageId, sessionId }: RegisterFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const selectedPackage = CREDIT_PACKAGES.find((p) => p.id === packageId)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (error) {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' })
      setLoading(false)
      return
    }

    if (!data.user) {
      toast({ title: 'Confirme seu e-mail', description: 'Verifique sua caixa de entrada.' })
      setLoading(false)
      return
    }

    // Criar perfil do usuário
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      name,
      role: 'cliente',
    })

    // Inicializar saldo de créditos
    await supabase.from('credit_balances').insert({
      user_id: data.user.id,
      credits_available: 0,
      credits_used: 0,
    })

    // Se tem packageId, redirecionar para checkout Stripe
    if (packageId && selectedPackage) {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })

      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
        return
      }
    }

    router.push('/dashboard/cliente')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar sua conta</CardTitle>
        <CardDescription>
          {selectedPackage
            ? `Você escolheu o pacote ${selectedPackage.name} — ${selectedPackage.priceLabel}`
            : 'Preencha seus dados para continuar'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Criando conta...' : selectedPackage ? `Criar conta e pagar ${selectedPackage.priceLabel}` : 'Criar conta'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Já tem conta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Ao criar sua conta você concorda com os{' '}
            <Link href="/termos" className="underline hover:text-foreground">
              Termos de Uso
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
