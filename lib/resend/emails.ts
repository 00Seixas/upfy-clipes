import { resend, FROM_EMAIL } from './client'

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Bem-vindo à UPFY Clipes! 🎬',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7C3AED;">Bem-vindo à UPFY Clipes!</h1>
        <p>Olá${name ? `, ${name}` : ''}!</p>
        <p>Seus créditos já estão disponíveis. Agora é só enviar seu vídeo e aguardar os clipes.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cliente"
           style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Acessar plataforma
        </a>
      </div>
    `,
  })
}

export async function sendClipeReadyEmail(to: string, orderTitle: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Seu clipe está pronto! 🎉',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7C3AED;">Seu clipe está pronto!</h1>
        <p>O clipe <strong>"${orderTitle}"</strong> foi editado e está disponível na plataforma.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cliente/clipes"
           style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Ver clipe
        </a>
      </div>
    `,
  })
}

export async function sendLowCreditsEmail(to: string, creditsLeft: number) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Seus créditos estão acabando ⚠️',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F97316;">Créditos acabando!</h1>
        <p>Você tem apenas <strong>${creditsLeft.toLocaleString('pt-BR')} créditos</strong> restantes.</p>
        <p>Compre mais créditos ou assine um plano mensal para continuar criando clipes.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cliente/creditos"
           style="display: inline-block; background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Recarregar créditos
        </a>
      </div>
    `,
  })
}
