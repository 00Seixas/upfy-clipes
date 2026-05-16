import type { Metadata } from 'next'
import RegisterForm from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Criar conta' }

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { package?: string; session_id?: string }
}) {
  return <RegisterForm packageId={searchParams.package} sessionId={searchParams.session_id} />
}
