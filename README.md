# Colorindo Engine 🎨

> Plataforma SaaS B2B para geração automatizada de livros infantis personalizados de colorir usando inteligência artificial. Inclui gestão de contas, rateio de créditos e pipeline assíncrono via Webhooks.

---

## 📖 Documentação

| Documento | Descrição |
|-----------|-----------|
| [docs/PRD.md](docs/PRD.md) | **Product Requirements Document** completo |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | **Documentação técnica** (schema, APIs, infra) |

---

## ⚡ Quick Start (Desenvolvedores)

```bash
# 1. Instalar dependências
npm install

# 2. Rodar dev server (Vite)
npm run dev

# 3. Deploy Edge Functions (⚠️ SEMPRE com --no-verify-jwt)
npx supabase functions deploy generate-book --project-ref prhlccqaqfksbrxngkek --no-verify-jwt
```

---

## 🧠 Contexto para LLMs & Desenvolvedores

**O que é:** Sistema web para gerar livros de colorir personalizados. Operador envia foto → IA gera personagem → capa → cenas → upscale → PDF.

### Arquivos-Chave (Core):
- `supabase/functions/generate-book/index.ts`: **Motor Principal** (Pipeline IA via Webhooks).
- `src/pages/PedidoDetalhes.jsx`: Interface de acompanhamento, aprovações e recuperação.
- `src/pages/ContasAdmin.jsx`: Gestão B2B (Créditos/Contas).
- `src/App.jsx`: Definição de rotas e níveis de acesso.

### Decisões Críticas de Arquitetura:
1. **Webhook Mode:** O sistema utiliza `callBackUrl` da Kie.ai. Evita polling agressivo e garante escalabilidade.
2. **Auto-invocação:** A Edge Function `generate-book` dispara a si mesma para etapas de `upscale` e `pdf` usando a `SERVICE_ROLE_KEY`.
3. **Resiliência:** Upscale tem fallback automático para a imagem original. Botão de "Recovery" manual disponível na UI.
4. **Segurança/LGPD:** Fotos são deletadas após 15 dias. RLS habilitado. Deploy de funções **requer** `--no-verify-jwt`.

---

## 📁 Estrutura do Projeto

```
colorindo-app/
├── docs/                          # PRD e Arquitetura detalhada
├── src/                           # Frontend React (Vite)
│   ├── components/                # UI Reutilizável
│   ├── pages/                     # Páginas (Dashboard, B2B, Admin)
│   └── context/                   # Global State (Auth, Accounts)
├── supabase/functions/            # Edge Functions (Pipeline, Cleanup, Admin)
├── package.json                   # React 18, Vite 5
└── README.md                      # Este arquivo
```

---

## 🔄 Pipeline IA (8 Etapas)

1. **Avatar:** Foto → Cartoon (Kie.ai)
2. **Aprovação 1:** Operador aprova personagem
3. **Capa:** Geração via Webhook (Kie.ai)
4. **Aprovação 2:** Operador aprova capa
5. **Cenas:** N cenas paralelas via Webhook (Kie.ai)
6. **Upscale:** Aumento de resolução via Webhook
7. **PDF:** Conversão Imagens → PDF (PDF.co)
8. **Finalizado:** Upload Storage + Status "Review"

---

## 🛠️ Stack Técnica

- **Frontend:** React 18, Vite 5, Vanilla CSS (Glassmorphism).
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions, Storage).
- **IA:** Kie.ai (Geração & Upscale).
- **PDF:** PDF.co API.
- **Hosting:** Vercel.

---

## ⚠️ Gotchas & Dicas
- **Polling:** O polling no frontend (`check-job`) é apenas um fallback de interface. O real motor é o Webhook.
- **Temas:** Pedidos antigos usam o campo `theme` (text). Pedidos novos usam `theme_id` (FK).
- **Purge:** O cron de limpeza roda automaticamente para cumprir a LGPD.

---

## 🔗 Links e Métricas
- **Dashboard Supabase:** [Link](https://supabase.com/dashboard/project/prhlccqaqfksbrxngkek)
- **Tabelas:** 9 | **Funções:** 3 | **Páginas:** 22
