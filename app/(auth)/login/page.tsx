export const dynamic = 'force-dynamic'

import LoginForm from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="UPFY" className="h-8 mx-auto mb-6" />
        <h1 className="text-xl font-semibold text-white">Entrar na plataforma</h1>
        <p className="text-sm text-zinc-500 mt-1">Acesso exclusivo para clientes e equipe UPFY</p>
      </div>
      <LoginForm />
    </div>
  )
}
