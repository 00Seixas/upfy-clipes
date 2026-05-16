# Banco de Dados — UPFY Clipes

## Como aplicar as migrações

### Opção 1 — Supabase CLI (recomendado)

```bash
# Instalar CLI
npm install -g supabase

# Linkar ao projeto (pegar o project-id no dashboard.supabase.com)
supabase link --project-ref SEU_PROJECT_ID

# Aplicar todas as migrações em ordem
supabase db push

# Ou aplicar uma por uma:
supabase db push --file supabase/migrations/001_create_tables.sql
supabase db push --file supabase/migrations/002_rls_policies.sql
supabase db push --file supabase/migrations/003_triggers.sql
supabase db push --file supabase/migrations/004_indexes.sql
supabase db push --file supabase/migrations/005_seed.sql
supabase db push --file supabase/migrations/006_functions.sql
```

### Opção 2 — SQL Editor no dashboard

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto → **SQL Editor**
3. Cole e execute cada arquivo na ordem (001 → 006)

---

## Ordem obrigatória das migrações

| Arquivo | Conteúdo |
|---------|----------|
| `001_create_tables.sql` | Enums + 13 tabelas com constraints |
| `002_rls_policies.sql` | Políticas RLS por role |
| `003_triggers.sql` | updated_at, novo usuário, aprovação de clipe, alertas de crédito, reset mensal |
| `004_indexes.sql` | Índices de performance |
| `005_seed.sql` | 4 estilos iniciais |
| `006_functions.sql` | deduct_credits, add_credits, get_admin_stats, get_client_stats, get_weekly_report_data + Realtime |

---

## Configurações importantes no dashboard Supabase

### 1. Habilitar pg_cron
`Settings → Database → Extensions → pg_cron → Enable`

### 2. Habilitar Realtime nas tabelas
As tabelas já são adicionadas ao `supabase_realtime` na migração 006, mas confirme em:
`Database → Replication → Source → supabase_realtime`

### 3. Gerar tipos TypeScript
Após aplicar as migrações, regenere o arquivo de tipos:
```bash
npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/supabase.ts
```

### 4. Criar usuário admin
1. Crie o usuário em `Authentication → Users → Add User`
2. Copie o UUID gerado
3. No SQL Editor, descomente e execute o bloco no final do `005_seed.sql`

---

## Resumo das tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Perfis (cliente/editor/admin) — estende auth.users |
| `credit_balances` | Saldo de créditos por cliente |
| `subscriptions` | Assinaturas mensais Stripe |
| `orders` | Pedidos de clipes (reel ou longo) |
| `videos` | Vídeos brutos + transcrição Whisper |
| `deliverables` | Clipes finalizados + grau de viralização + feedback |
| `revisions` | Solicitações de revisão (1 por pedido) |
| `credit_purchases` | Histórico de compras avulsas |
| `styles` | Estilos de edição disponíveis |
| `social_connections` | Tokens OAuth (YouTube, Instagram, TikTok) |
| `post_logs` | Histórico de postagens automáticas |
| `post_schedule` | Configuração de agendamento por plataforma |
| `notifications` | Notificações in-app |

---

## Funções de negócio

```sql
-- Debitar créditos (atômico, com lock)
SELECT public.deduct_credits('user-uuid', 1800, 'order-uuid');

-- Adicionar créditos
SELECT public.add_credits('user-uuid', 10000);

-- Métricas admin
SELECT public.get_admin_stats();

-- Métricas do cliente
SELECT public.get_client_stats('user-uuid');

-- Dados para relatório semanal
SELECT public.get_weekly_report_data('user-uuid');
```
