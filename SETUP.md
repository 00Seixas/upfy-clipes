# UPFY Clipes — Guia de Configuração

## 1. Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha todas as variáveis:

```bash
cp .env.example .env.local
```

## 2. Supabase — Aplicar Migrations

No painel do Supabase, acesse **SQL Editor** e execute os arquivos na ordem abaixo:

```
supabase/migrations/001_extensions.sql
supabase/migrations/002_tables.sql
supabase/migrations/003_triggers.sql
supabase/migrations/004_indexes.sql
supabase/migrations/005_rls.sql
supabase/migrations/006_seed.sql    ← cria followup_templates
supabase/migrations/007_functions.sql
```

> ⚠️ Ignore os demais arquivos .sql — são do projeto anterior.

## 3. Criar Admin

Após aplicar as migrations:

1. Vá em **Authentication → Users → Add User** no painel Supabase
2. Email: `admin@upfymidia.com` (ou o que preferir)
3. Senha: uma senha segura
4. Marque **Email confirmed**
5. No **SQL Editor**, execute:

```sql
UPDATE profiles
SET role = 'admin', name = 'Admin UPFY'
WHERE email = 'admin@upfymidia.com';
```

## 4. Cloudflare R2

1. Crie um bucket no Cloudflare R2
2. Em **Settings → CORS**, adicione:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```
3. Crie um API Token com permissão de leitura e escrita no bucket
4. Preencha as variáveis `CLOUDFLARE_R2_*` no `.env.local`

## 5. Z-API (WhatsApp)

1. Crie uma instância no painel Z-API
2. Conecte seu WhatsApp na instância
3. Preencha `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_SECURITY_TOKEN`

## 6. Resend (E-mail)

1. Crie uma conta em resend.com
2. Configure um domínio ou use o domínio de testes
3. Preencha `RESEND_API_KEY` e `RESEND_FROM_EMAIL`

## 7. Rodar o Projeto

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000/login

## 8. Deploy na Vercel

1. Conecte o repositório na Vercel
2. Adicione todas as variáveis de ambiente do `.env.local`
3. Deploy automático ao push na `main`

## Fluxo de Uso

### Cadastrar primeiro cliente:
1. Login como admin → `/admin/clientes` → **Novo cliente**
2. Preenche nome, WhatsApp, qtd. de clipes e prazo
3. Sistema gera senha automática
4. Admin edita a mensagem de boas-vindas e clica **Enviar mensagem**
5. Cliente recebe WhatsApp com link + credenciais

### Cadastrar primeiro editor:
1. Login como admin → `/admin/editores` → **Novo editor**
2. Preenche nome e e-mail
3. Sistema gera senha e envia e-mail automaticamente via Resend
