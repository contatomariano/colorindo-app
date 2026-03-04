# Colorindo Engine

> Plataforma SaaS B2B para geração automatizada de livros infantis personalizados de colorir usando IA.

## ⚡ Quick Context (para LLMs)

**O que é:** Sistema web para gerar livros de colorir personalizados para crianças. O operador envia foto + dados da criança → IA gera personagem cartoon → capa → cenas → upscale → PDF pronto para impressão.

**Stack:** React 18 (Vite) + Supabase (Auth, DB PostgreSQL, Edge Functions, Storage) + Kie.ai (geração de imagens) + PDF.co (conversão PDF)

**Supabase Project:** `prhlccqaqfksbrxngkek` (sa-east-1)

---

## 🧠 Contexto Essencial para LLMs

### Antes de fazer qualquer alteração, leia:

1. **`docs/PRD.md`** — Product Requirements Document completo
2. **`docs/ARCHITECTURE.md`** — Documentação técnica detalhada com schema do banco, APIs, diretórios

### Arquivos-Chave (por ordem de importância):

| Arquivo | O que faz | Tamanho |
|---------|-----------|---------|
| `supabase/functions/generate-book/index.ts` | **Pipeline IA completo** — o coração do sistema | 1105 linhas |
| `src/pages/PedidoDetalhes.jsx` | **Detalhes + pipeline visual** — componente mais complexo | 52KB |
| `src/pages/NovoPedido.jsx` | Formulário de criação de pedido (foto, cores, tema) | 18KB |
| `src/pages/NovoTemaAdmin.jsx` | CRUD de temas (admin) com editor de cenas | 27KB |
| `src/context/AuthContext.jsx` | Autenticação e perfis | 3.6KB |
| `src/context/AccountContext.jsx` | Multitenancy (seletor de contas) | 2.8KB |
| `src/App.jsx` | Router com todas as rotas | 5KB |

### Decisões Críticas de Arquitetura

1. **Edge Functions sem JWT no gateway** — O `--no-verify-jwt` é OBRIGATÓRIO no deploy. A validação JWT é feita dentro do código, não no gateway Supabase. Sem isso, tudo retorna 401.

2. **Auto-invocação recursiva** — A Edge Function `generate-book` chama a si mesma:
   - Quando cenas terminam → invoca com `action: "upscale"`
   - Quando upscale termina → invoca com `action: "pdf"`
   - Usa `SUPABASE_SERVICE_ROLE_KEY` como Bearer token nessas chamadas internas

3. **Polling do frontend** — O frontend faz polling a cada 12 segundos via `check-job` para verificar status das tasks na Kie.ai. Não usa websockets/realtime para isso.

4. **Fallback no upscale** — Se um upscale falhar no Kie.ai, o código usa a imagem original (sem upscale) em vez de travar o pipeline.

5. **Dupla referência de tema** — Orders têm `theme` (texto, legado) E `theme_id` (FK, novo). Ao contar pedidos por tema, use AMBOS como fallback.

6. **LGPD** — Fotos de crianças são purgadas após 15 dias via `cron-storage-cleanup`. Campos PII são substituídos por `[PURGED]`.

---

## 📁 Estrutura do Projeto

```
colorindo-app/
├── docs/                          # 📖 Documentação
│   ├── PRD.md                     # Product Requirements
│   ├── ARCHITECTURE.md            # Documentação técnica
│   └── README.md                  # Este arquivo
│
├── src/                           # 🎨 Frontend React
│   ├── App.jsx                    # Router principal
│   ├── main.jsx                   # Entrypoint
│   ├── index.css                  # Design system
│   ├── theme.css                  # Tokens visuais
│   ├── context/                   # Auth + Account providers
│   ├── lib/                       # Supabase client + API utils
│   ├── layouts/                   # DashboardLayout
│   ├── components/                # Sidebar
│   └── pages/                     # 22 páginas
│
├── supabase/functions/            # ⚡ Edge Functions (Deno)
│   ├── generate-book/             # Pipeline IA (core)
│   ├── cron-storage-cleanup/      # LGPD purge
│   └── admin-manage-users/        # User management
│
├── .env.local                     # Vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── package.json                   # React 18, Vite 5, Supabase JS v2
└── vite.config.js
```

---

## 🗄️ Banco de Dados (9 tabelas)

```
accounts ──┬── profiles (users)
           ├── projects ──── orders (livros)
           └── orders ────── themes
                              └── theme_scenes

master_prompts (prompts IA globais)
plans (assinatura)
settings (key-value config)
```

### Tabela `orders` (★ Principal)
- **Status:** queued → processing → awaiting_avatar → awaiting_cover → review → completed → delivered
- **Pipeline tracking:** `error_message` armazena `taskId:avatar`, `taskId:scenes`, `taskId:upscale`, `taskId:pdf_convert`
- **Dados IA:** `character_url`, `cover_url`, `pages_data` (JSONB array), `cover_upscale_taskid`
- **Saída:** `cover_pdf_url`, `scenes_pdf_url` (PDFs no Supabase Storage)

---

## 🔄 Pipeline de Geração (8 etapas)

```
1. AVATAR       → Kie.ai gpt4o-image (foto → cartoon)
2. APROVAÇÃO 1  → Usuário aprova personagem
3. CAPA         → Kie.ai gpt4o-image (personagem + tema)
4. APROVAÇÃO 2  → Usuário aprova capa
5. CENAS        → Kie.ai gpt4o-image (N cenas paralelas)
6. UPSCALE      → Kie.ai nano-banana-upscale (2x)
7. PDF          → PDF.co merge2 (imagens → PDF)
8. CONCLUÍDO    → Upload Storage + status "review"
```

**Fluxo de invocação:**
```
Frontend: action=avatar → poll check-job(avatar)
Frontend: Aprovação manual
Frontend: action=cover → poll check-job(cover)
Frontend: Aprovação manual
Frontend: action=scenes → poll check-job(scenes)
Backend:  auto-invoke action=upscale → poll check-job(upscale)
Backend:  auto-invoke action=pdf
Sistema:  status = "review" → CONCLUÍDO
```

---

## 🛠️ Comandos Úteis

```bash
# Dev server
npm run dev

# Build produção
npm run build

# Deploy Edge Functions (⚠️ SEMPRE com --no-verify-jwt)
npx supabase functions deploy generate-book --project-ref prhlccqaqfksbrxngkek --no-verify-jwt
npx supabase functions deploy cron-storage-cleanup --project-ref prhlccqaqfksbrxngkek --no-verify-jwt

# Login Supabase CLI
npx supabase login
```

---

## 🔑 Variáveis de Ambiente

### Frontend (`.env.local`)
```
VITE_SUPABASE_URL=https://prhlccqaqfksbrxngkek.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Edge Functions (Supabase Dashboard)
```
KIE_API_KEY       # API key Kie.ai (sem "Bearer")
PDFCO_API_KEY     # API key PDF.co
SUPABASE_URL      # Auto-preenchido
SUPABASE_SERVICE_ROLE_KEY  # Auto-preenchido
```

---

## ⚠️ Gotchas & Armadilhas

1. **NUNCA deploie Edge Functions sem `--no-verify-jwt`** — Causa 401 em todas as chamadas
2. **PedidoDetalhes.jsx tem encoding UTF-8** — Se recuperar do git via PowerShell, use `git checkout` e NÃO `git show | Out-File` (corrompe acentos)
3. **`error_message` não é só erro** — O campo armazena o estado atual do polling: `taskId:avatar`, `taskId:scenes`, `taskId:upscale`, `taskId:pdf_convert`
4. **Pedidos legados não têm `theme_id`** — Usam campo `theme` (texto). Ao contar, cheque ambos
5. **O Supabase client global usa `SUPABASE_SERVICE_ROLE_KEY`** nas Edge Functions — Isso bypassa RLS, cuidado
6. **O polling do frontend roda a cada 12s** — Definido em `PedidoDetalhes.jsx` via `setInterval`
7. **Upscale tem fallback** — Se Kie.ai retornar erro, usa imagem original. O pipeline NUNCA deve travar

---

## 📊 Métricas Atuais

- **Tabelas:** 9
- **Edge Functions:** 3
- **Páginas Frontend:** 22
- **Temas cadastrados:** 5
- **Pedidos concluídos:** 3 (dados limpos)
- **Projetos ativos:** 1

---

## 🔗 Links Úteis

- **Supabase Dashboard:** https://supabase.com/dashboard/project/prhlccqaqfksbrxngkek
- **GitHub:** https://github.com/contatomariano/colorindo-app
- **Vercel:** Deploy automático via GitHub push
- **Kie.ai API:** https://api.kie.ai
- **PDF.co API:** https://api.pdf.co
