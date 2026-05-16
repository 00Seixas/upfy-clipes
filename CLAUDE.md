# UPFY Clipes — Documentação Interna MVP

## Visão Geral

Plataforma **interna B2B** para gestão do fluxo de edição de clipes da UPFY Mídia. Não é pública — apenas clientes cadastrados pelo admin têm acesso.

### 3 Perfis de Usuário
- **Cliente** — acessa via WhatsApp + senha (definida pelo admin). Faz upload de vídeos com briefing, visualiza e baixa clipes entregues.
- **Editor** — acessa via e-mail + senha (gerada automaticamente). Pega jobs na fila, faz upload dos clipes finalizados com grau de viralidade e feedback.
- **Admin** — cadastrado diretamente no banco (seed). Gerencia clientes e editores, aprova clipes, dispara mensagens WhatsApp via Z-API, gerencia contratos.

### O que NÃO existe neste MVP
- Sem Stripe / sistema de pagamentos
- Sem créditos
- Sem página pública / landing
- Sem integrações YouTube / Instagram / TikTok
- Sem Whisper / IA
- Sem vídeo de onboarding

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14, App Router, TypeScript |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| Storage | Cloudflare R2 (S3 SDK) |
| Estilo | Tailwind CSS + shadcn/ui (dark mode) |
| WhatsApp | Z-API |
| E-mail | Resend (boas-vindas para editores) |
| Deploy | Vercel |

---

## Estrutura de Pastas

```
/app
  /(auth)
    layout.tsx              # Layout sem sidebar (tela de login)
    /login/page.tsx         # Login único — WhatsApp ou e-mail + senha
  /(cliente)
    layout.tsx              # Layout com sidebar do cliente
    /inicio/page.tsx        # Dashboard do cliente
    /enviar-videos/page.tsx # Upload de vídeo bruto + briefing
    /meus-clipes/page.tsx   # Clipes entregues (estilo Google Drive)
    /calendario/page.tsx    # Calendário de entregas
  /(editor)
    layout.tsx              # Layout com sidebar do editor
    /fila/page.tsx          # Jobs disponíveis para pegar
    /em-andamento/page.tsx  # Jobs em edição
    /entregues/page.tsx     # Jobs finalizados pelo editor
  /(admin)
    layout.tsx              # Layout com sidebar do admin
    /dashboard/page.tsx     # Métricas gerais
    /kanban/page.tsx        # Kanban de pedidos
    /clientes/page.tsx      # Lista de clientes
    /clientes/[id]/page.tsx # Detalhe do cliente (contrato, clipes, histórico)
    /editores/page.tsx      # Lista de editores
    /editores/[id]/page.tsx # Detalhe do editor
  /api/                     # API Routes (Step 2+)
  layout.tsx                # Root layout
  page.tsx                  # Redireciona para /login
  globals.css               # Design tokens dark mode

/lib
  /supabase
    server.ts               # createClient() e createServiceClient() (SSR)
    client.ts               # createClient() browser
  /zapi
    client.ts               # sendWhatsappMessage()
  /r2
    client.ts               # S3Client para Cloudflare R2

/types
  index.ts                  # Tipos de domínio (Role, Order, Briefing, etc.)
  database.ts               # Tipos do banco Supabase

/components
  /ui/                      # shadcn/ui components
  /auth/                    # Formulários de login
  /admin/                   # Componentes da área admin
  /editor/                  # Componentes da área editor
  /cliente/                 # Componentes da área cliente

/supabase
  /migrations/              # SQL migrations (Step 2)

middleware.ts               # Auth + role-based routing
```

---

## Modelo de Auth

### Cliente
- Login com **número de WhatsApp** (ex: `5511999999999`) + senha
- Senha definida pelo admin no momento do cadastro
- O número de WhatsApp é armazenado no `profiles.whatsapp` e usado como identificador de login
- Supabase Auth usa o campo `email` internamente no formato `<whatsapp>@clientes.upfy.internal`

### Editor
- Login com **e-mail real** + senha gerada automaticamente
- Admin cadastra o editor → sistema gera senha → envia por e-mail (Resend)
- Pode trocar senha após o primeiro acesso

### Admin
- Criado diretamente via seed SQL no Supabase
- E-mail + senha definidos manualmente no `.env.local` para o seed
- Role `admin` no `profiles.role`

### Controle de Acesso
- `middleware.ts` lê o cookie de sessão Supabase e verifica `profiles.role`
- Redirecionamentos por role:
  - `cliente` → `/inicio`
  - `editor` → `/editor/fila`
  - `admin` → `/admin/dashboard`
- Acesso cross-role é bloqueado e redireciona para a rota correta do role

---

## Fluxos Principais

### Fluxo do Cliente
1. Admin cadastra cliente com WhatsApp + senha + contrato (clips_total, datas)
2. Cliente faz login → acessa `/inicio` (resumo do contrato)
3. Cliente faz upload de vídeo bruto + preenche briefing (tom, música, CTA, notas)
4. Admin/editor recebe novo pedido na fila
5. Cliente recebe clipes prontos em `/meus-clipes` e pode baixar

### Fluxo do Editor
1. Admin cadastra editor → editor recebe e-mail de boas-vindas com credenciais
2. Editor faz login → acessa `/editor/fila` (pedidos disponíveis)
3. Editor pega um job → vai para `/editor/em-andamento`
4. Editor faz upload do clipe finalizado + preenche grau de viralidade + feedback
5. Pedido vai para aprovação do admin

### Fluxo do Admin
1. Admin gerencia clientes em `/admin/clientes` (criar, editar contrato, encerrar)
2. Admin gerencia editores em `/admin/editores` (criar, resetar senha)
3. Admin aprova/rejeita clipes no kanban `/admin/kanban`
4. Admin dispara mensagens WhatsApp via Z-API em pontos-chave do fluxo
5. Admin acompanha métricas em `/admin/dashboard`

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_APP_URL` | URL da aplicação (ex: https://clipes.upfymidia.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (apenas server-side) |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Account ID da Cloudflare |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Access key do R2 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Secret key do R2 |
| `CLOUDFLARE_R2_BUCKET_NAME` | Nome do bucket R2 |
| `CLOUDFLARE_R2_PUBLIC_URL` | URL pública do bucket R2 |
| `ZAPI_INSTANCE_ID` | ID da instância Z-API |
| `ZAPI_TOKEN` | Token da instância Z-API |
| `ZAPI_SECURITY_TOKEN` | Client-Token para autenticação Z-API |
| `RESEND_API_KEY` | API key do Resend |
| `RESEND_FROM_EMAIL` | E-mail de origem (ex: noreply@upfymidia.com) |

---

## Comandos de Desenvolvimento

```bash
# Servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Gerar tipos Supabase (após criar migration)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts

# Aplicar migrations localmente
npx supabase db push

# Deploy via Vercel (automático ao push na main)
git push origin main
```

---

## Design System

- **Dark mode** por padrão (classe `dark` no `<html>`)
- **Primária**: `#7C3AED` (roxo)
- **Secundária**: `#F97316` (laranja)
- **Background**: `#0A0A0B`
- **Surface**: `#111113`
- Estilo: Linear / Vercel — limpo, profissional, sem exageros
