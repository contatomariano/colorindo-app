# Documentação Técnica — Colorindo Engine

**Versão:** 1.0 | **Última atualização:** 03/03/2026

---

## 1. Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                 │
│   ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│   │ Login    │  │ Pedidos   │  │ Projetos │  │ Admin     │  │
│   │          │  │ Pipeline  │  │          │  │ (Temas,   │  │
│   │          │  │ Detalhes  │  │          │  │  Prompts, │  │
│   │          │  │           │  │          │  │  Users)   │  │
│   └──────────┘  └───────────┘  └──────────┘  └───────────┘  │
│         │              │             │              │        │
│   ┌─────┴──────────────┴─────────────┴──────────────┴─────┐  │
│   │              Supabase JS Client (v2)                  │  │
│   │    Auth · Realtime · Database (via RLS) · Storage     │  │
│   └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┴───────────────────────────────────┐
│                    SUPABASE CLOUD                             │
│   ┌─────────────────────────────────────────────────────┐    │
│   │                  Edge Functions (Deno)               │    │
│   │  ┌──────────────┐ ┌────────────────┐ ┌───────────┐  │    │
│   │  │ generate-book│ │ cron-storage-  │ │ admin-    │  │    │
│   │  │ (Webhook +   │ │ cleanup (LGPD) │ │ manage-   │  │    │
│   │  │  Pipeline)   │ │                │ │ users     │  │    │
│   │  └──────┬───▲───┘ └────────────────┘ └───────────┘  │    │
│   │         │   │ Callback (POST)                        │    │
│   │    ┌────▼───┴──┐     ┌────────────┐                  │    │
│   │    │ Kie.ai    │     │ PDF.co     │                  │    │
│   │    │ API       │     │ API        │                  │    │
│   │    └───────────┘     └────────────┘                  │    │
│   └─────────────────────────────────────────────────────┘    │
│   ┌───────────────┐  ┌──────────┐  ┌─────────────────┐      │
│   │ PostgreSQL    │  │ Auth     │  │ Storage         │      │
│   │ (9 tabelas)   │  │ (JWT)    │  │ (order_pdfs)    │      │
│   │               │  │          │  │ (order_images)  │      │
│   └───────────────┘  └──────────┘  └─────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Diretórios

```
colorindo-app/
├── docs/                          # Documentação
│   ├── PRD.md                     # Product Requirements Document
│   ├── ARCHITECTURE.md            # Este arquivo
│   └── README.md                  # README para LLMs
│
├── src/                           # Frontend React
│   ├── main.jsx                   # Entrypoint React
│   ├── App.jsx                    # Router + ProtectedRoute
│   ├── index.css                  # Design system (variáveis, utilitários)
│   ├── theme.css                  # Tokens visuais, glassmorphism
│   ├── App.css                    # Estilos adicionais
│   │
│   ├── context/                   # React Context Providers
│   │   ├── AuthContext.jsx        # Auth state (user, profile, signIn/Out)
│   │   └── AccountContext.jsx     # Multitenancy (account selector)
│   │
│   ├── lib/                       # Utilitários
│   │   ├── supabase.js            # Singleton do Supabase client
│   │   └── backendApi.js          # Wrapper fetch para API REST
│   │
│   ├── layouts/                   # Layouts
│   │   └── DashboardLayout.jsx    # Layout com sidebar + main content
│   │
│   ├── components/                # Componentes reutilizáveis
│   │   └── Sidebar.jsx            # Menu lateral com navegação
│   │
│   └── pages/                     # Páginas (22 arquivos)
│       ├── Login.jsx              # Tela de login
│       ├── Pedidos.jsx            # Listagem de pedidos
│       ├── PedidoDetalhes.jsx     # Detalhes + pipeline visual (52KB, maior arquivo)
│       ├── PedidoRevisao.jsx      # Revisão de pedido concluído
│       ├── PedidoLog.jsx          # Log de eventos do pedido
│       ├── NovoPedido.jsx         # Formulário de novo pedido
│       ├── NovoPedidoLote.jsx     # Upload em lote
│       ├── Projetos.jsx           # Listagem de projetos
│       ├── NovoProjeto.jsx        # Formulário de novo projeto
│       ├── EditarProjeto.jsx      # Edição de projeto
│       ├── ProjetoPedidos.jsx     # Pedidos de um projeto específico
│       ├── Temas.jsx              # Catálogo de temas (user)
│       ├── BibliotecaTemas.jsx    # Gestão de temas (admin)
│       ├── NovoTemaAdmin.jsx      # CRUD de tema (admin)
│       ├── Pipeline.jsx           # Monitoramento de pipeline
│       ├── PipelineDemo.jsx       # Demo visual do pipeline
│       ├── Prompts.jsx            # CRUD master prompts
│       ├── Configuracoes.jsx      # Configurações globais
│       ├── Usuarios.jsx           # Gestão de usuários (admin)
│       ├── EditarUsuario.jsx      # Edição de usuário
│       ├── MinhaConta.jsx         # Perfil do usuário logado
│       └── SeedData.jsx           # Utilitário de seed
│
├── supabase/                      # Backend Supabase
│   └── functions/                 # Edge Functions
│       ├── generate-book/         # Pipeline principal (1105 linhas)
│       │   └── index.ts
│       ├── cron-storage-cleanup/  # LGPD: purga de dados expirados
│       │   └── index.ts
│       └── admin-manage-users/    # Gerenciamento admin de usuários
│           └── index.ts
│
├── index.html                     # HTML base (Vite)
├── vite.config.js                 # Config Vite
├── package.json                   # Dependências NPM
├── .env.local                     # Variáveis de ambiente (gitignored)
└── .gitignore
```

---

## 3. Frontend — Detalhamento

### 3.1 Routing (`App.jsx`)

```
/login                    → Login.jsx (público)
/                         → Redirect → /pedidos
/pedidos                  → Pedidos.jsx
/pedidos/novo             → NovoPedido.jsx
/pedidos/lote             → NovoPedidoLote.jsx
/pedidos/:id              → PedidoDetalhes.jsx (★ Componente principal)
/pedidos/:id/revisao      → PedidoRevisao.jsx
/pedidos/:id/log          → PedidoLog.jsx
/projetos                 → Projetos.jsx
/projetos/novo            → NovoProjeto.jsx
/projetos/:id/editar      → EditarProjeto.jsx
/projetos/:id/pedidos     → ProjetoPedidos.jsx
/temas                    → Temas.jsx (catálogo user)
/pipeline                 → Pipeline.jsx
/admin/temas              → BibliotecaTemas.jsx
/admin/temas/novo         → NovoTemaAdmin.jsx
/admin/temas/:id/editar   → NovoTemaAdmin.jsx
/admin/prompts            → Prompts.jsx
/admin/configuracoes      → Configuracoes.jsx
/admin/contas            → ContasAdmin.jsx
/admin/contas/:id/editar    → EditarConta.jsx
/admin/usuarios           → Usuarios.jsx
/admin/usuarios/:id/editar → EditarUsuario.jsx
/minha-conta              → MinhaConta.jsx
```

### 3.2 Contextos React

#### `AuthContext.jsx`
- Gerencia estado de autenticação: `user`, `profile`, `loading`
- Métodos: `signIn(email, password)`, `signUp(email, password, name)`, `signOut()`
- Flag derivada: `isAdmin` (profile.role === 'admin')
- Timeout de segurança de 4s para evitar deadlock no carregamento

#### `AccountContext.jsx`
- Gerencia seleção de conta ativa (multitenancy)
- Admin vê todas as contas, user vê só a sua
- Persiste seleção no `localStorage`
- Expõe: `selectedAccountId`, `account`, `allAccounts`, `refreshAccount`

### 3.3 Design System

- **Abordagem:** CSS puro com variáveis CSS (Custom Properties)
- **Tema:** Light com glassmorphism (backdrop-filter, transparências)
- **Paleta:** Definida em `theme.css` com variáveis `--accent-1` a `--accent-4`
- **Ícones:** Font Awesome 6 (CDN)
- **Fontes:** Google Fonts (Outfit)
- **Responsividade:** Media queries em `index.css` para mobile (sidebar colapsável)

---

## 4. Backend — Edge Functions

### 4.1 `generate-book` (Pipeline Principal)

**Arquivo:** `supabase/functions/generate-book/index.ts` (1105 linhas)  
**Deploy:** `npx supabase functions deploy generate-book --no-verify-jwt`

#### Ações Suportadas (parâmetro `action`):

| Action | Descrição | Invocado por |
|--------|-----------|-------------|
| `avatar` | Gera personagem cartoon da foto | Frontend (NovoPedido) |
| `phase2-start`| Inicia a Capa e as Cenas simultaneamente | Frontend (Aprovar Personagem) |
| `cover` | Gera capa usando personagem aprovado | Auto-invocação |
| `scenes` | Gera N cenas em paralelo | Auto-invocação |
| `upscale` | Faz upscale 2x de todas as imagens | Callback Webhook (scenes) |
| `pdf` | Converte imagens em PDFs | Callback Webhook (upscale) |
| `check-job` | Verifica status (fallback/manual) | Frontend |
| `approve-cover` | Marca capa como aprovada | Frontend |

#### Webhook Mode (Query: `?webhook=true`):
Quando ativado, a função processa o payload de sucesso/falha da Kie.ai, extrai a URL da imagem e avança o pipeline para a próxima etapa (Ex: Cenas Concluídas → Disparar Upscale).

#### Helpers Internos:

| Função | Descrição |
|--------|-----------|
| `checkKieTask(taskId, isJob)` | Consulta status de task na Kie.ai |
| `requestKieTask(endpoint, payload)` | Dispara nova task na Kie.ai |
| `uploadPdfToStorage(tempUrl, storagePath)` | Baixa PDF temporário e faz upload definitivo |

#### Maps de Cor:

```typescript
SKIN_TONE_MAP  // #hex → descrição em inglês (8 tons)
HAIR_COLOR_MAP // #hex → descrição em inglês (8 cores)
```

#### Autenticação:

```typescript
// Chamadas do Frontend: valida JWT normal
const { data: { user } } = await supabaseClient.auth.getUser(token);

// Chamadas internas (upscale→pdf): bypassa JWT se token === SERVICE_ROLE_KEY
if (token === SUPABASE_SERVICE_ROLE_KEY) { isAdmin = true; }
```

#### Resiliência no Upscale:

Se um upscale falhar no Kie.ai, o código faz **fallback** para a imagem original em vez de ficar preso:

```typescript
} else if (check.error) {
    // FALLBACK: usa imagem original
    pageObj.upscaled_url = pageObj.image_url;
    resolvedCount++;
}
```

### 4.2 `cron-storage-cleanup` (LGPD)

**Arquivo:** `supabase/functions/cron-storage-cleanup/index.ts`  
**Deploy:** `npx supabase functions deploy cron-storage-cleanup --no-verify-jwt`

- Executa periodicamente (cron ou manual)
- Busca pedidos com `created_at < 15 dias` e `status IN (completed, delivered, review)`
- Remove arquivos do bucket `order_pdfs/{orderId}/`
- Mascara campos PII no banco: `child_photo_url`, `character_url`, `cover_url` → `[PURGED]`
- Ignora pedidos já purgados (campos já contêm `[PURGED]`)

### 4.3 `admin-manage-users`

- Gerenciamento administrativo de usuários
- Criação de usuárioss via `supabase.auth.admin`

---

## 5. Variáveis de Ambiente

### Frontend (`.env.local`)

```
VITE_SUPABASE_URL=https://prhlccqaqfksbrxngkek.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Edge Functions (Supabase Dashboard → Settings → Edge Functions)

```
SUPABASE_URL          # Auto-preenchido pelo Supabase
SUPABASE_SERVICE_ROLE_KEY  # Auto-preenchido pelo Supabase
KIE_API_KEY           # API key da Kie.ai (sem prefixo "Bearer")
PDFCO_API_KEY         # API key do PDF.co
```

---

## 6. Banco de Dados (PostgreSQL)

### 6.1 Schema Completo

#### `accounts` — Contas/Clientes (Multitenancy)
```sql
id              UUID PK DEFAULT gen_random_uuid()
name            TEXT NOT NULL
email           TEXT NOT NULL
phone           TEXT
status          TEXT DEFAULT 'active' CHECK (active, inactive)
plan            TEXT DEFAULT 'pro' CHECK (starter, pro, enterprise, custom)
credits         INTEGER DEFAULT 0
renewal_date    DATE
custom_projects_quota INTEGER
internal_notes  TEXT
created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

#### `profiles` — Perfis de Usuário
```sql
id              UUID PK (= auth.users.id)
account_id      UUID FK → accounts.id
name            TEXT NOT NULL
email           TEXT NOT NULL UNIQUE
phone           TEXT
role            TEXT DEFAULT 'user' CHECK (admin, manager, user, viewer)
avatar_url      TEXT
plan_id         UUID FK → plans.id
status          TEXT DEFAULT 'active' CHECK (active, inactive, pending)
last_login      TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

#### `orders` — Pedidos de Livros (★ Tabela Principal)
```sql
id              UUID PK DEFAULT gen_random_uuid()
project_id      UUID FK → projects.id
account_id      UUID FK → accounts.id
theme_id        UUID FK → themes.id
theme           TEXT NOT NULL          -- Nome do tema (legacy fallback)
child_name      TEXT
child_age       INTEGER
gender          TEXT
skin_tone       TEXT                   -- Hex da cor de pele
hair_color      TEXT                   -- Hex da cor do cabelo
child_photo_url TEXT                   -- URL da foto (PII, purga LGPD)
character_url   TEXT                   -- URL do personagem gerado
cover_url       TEXT                   -- URL da capa gerada
cover_approved  BOOLEAN DEFAULT false
cover_task_id   TEXT
cover_upscale_taskid TEXT
style           TEXT DEFAULT 'watercolor'
status          TEXT DEFAULT 'queued'  -- Estado do pipeline
  CHECK (queued, processing, awaiting_avatar, awaiting_cover,
         paused, review, completed, error, delivered)
scenes_total    INTEGER DEFAULT 7
scenes_done     INTEGER DEFAULT 0
upscale_done    INTEGER DEFAULT 0
pages_data      JSONB DEFAULT '[]'     -- Array de {page, text, image_url, taskId, ...}
error_message   TEXT                   -- Armazena taskId atual ou msg de erro
retry_count     INTEGER DEFAULT 0
pdf_url         TEXT                   -- URL do PDF miolo
cover_pdf_url   TEXT                   -- URL do PDF capa
scenes_pdf_url  TEXT                   -- URL do PDF cenas
pdf_taskid      TEXT
credits_cost    INTEGER DEFAULT 10
processing_time_s INTEGER
created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

#### `themes` — Temas de Livros
```sql
id              UUID PK DEFAULT gen_random_uuid()
name            TEXT NOT NULL
description     TEXT
cover_image_url TEXT
cover_url       TEXT
cover_prompt    TEXT
style           TEXT DEFAULT 'watercolor'
scenes_count    INTEGER DEFAULT 7
scenes_data     JSONB DEFAULT '[]'     -- Array de {prompt, refImageUrl}
age_range       TEXT DEFAULT '4-10'
status          TEXT DEFAULT 'active' CHECK (active, draft, archived)
is_premium      BOOLEAN DEFAULT false
ref_male_url    TEXT
ref_female_url  TEXT
ref_outfit_url  TEXT
ref_wireframe_url TEXT
created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

#### `projects` — Projetos/Campanhas
```sql
id              UUID PK DEFAULT gen_random_uuid()
account_id      UUID FK → accounts.id
name            TEXT NOT NULL
description     TEXT
theme_code      TEXT
status          TEXT DEFAULT 'active' CHECK (active, paused, completed, archived)
credits_used    INTEGER DEFAULT 0
orders_count    INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

#### `master_prompts` — Prompts Globais de IA
```sql
id              TEXT PK DEFAULT gen_random_uuid()
name            TEXT NOT NULL
description     TEXT
type            TEXT DEFAULT 'image' CHECK (image, text, narrator, title)
template        TEXT                   -- Prompt template com variáveis
system_prompt   TEXT                   -- System prompt para o modelo
model           TEXT DEFAULT 'sdxl'
model_id        TEXT                   -- ID do modelo na Kie.ai
variables       JSONB DEFAULT '[]'
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

#### `plans`, `settings`, `theme_scenes` — Tabelas auxiliares
- `plans`: Planos de assinatura (starter, pro, enterprise, custom)
- `settings`: Key-value store para configurações globais
- `theme_scenes`: Cenas individuais (tabela relacional, não usada atualmente — `scenes_data` no theme)

---

## 7. APIs Externas

### 7.1 Kie.ai API

**Base URL:** `https://api.kie.ai/api/v1/`

| Endpoint | Uso | Modelo |
|----------|-----|--------|
| `gpt4o-image/generate` | Geração de cenas | gpt4o-image |
| `gpt4o-image/record-info` | Status de task gpt4o | — |
| `jobs/createTask` | Geração de personagem, capa e upscale | nano-banana-pro / nano-banana-upscale |
| `jobs/recordInfo` | Status de task jobs | — |

**Autenticação:** `Authorization: Bearer {KIE_API_KEY}`

### 7.2 PDF.co API

**Base URL:** `https://api.pdf.co/v1/`

| Endpoint | Uso |
|----------|-----|
| `pdf/merge2` | Converte URL(s) de imagem em PDF |

**Autenticação:** `x-api-key: {PDFCO_API_KEY}`

---

## 8. Deploy

### Frontend (Vercel)
- Push para `main` no GitHub → deploy automático
- Variáveis de ambiente configuradas no Vercel Dashboard

### Edge Functions (Supabase CLI)
```bash
# Login (necessário apenas uma vez)
npx supabase login

# Deploy das funções (⚠️ SEMPRE usar --no-verify-jwt)
npx supabase functions deploy generate-book --project-ref prhlccqaqfksbrxngkek --no-verify-jwt
npx supabase functions deploy cron-storage-cleanup --project-ref prhlccqaqfksbrxngkek --no-verify-jwt
npx supabase functions deploy admin-manage-users --project-ref prhlccqaqfksbrxngkek --no-verify-jwt
```

> **⚠️ IMPORTANTE:** Sempre usar `--no-verify-jwt` porque a validação JWT é feita DENTRO do código da função, não no gateway do Supabase. Sem essa flag, o gateway rejeita todas as chamadas com 401.

---

## 9. Padrões e Convenções

- **Linguagem do código:** Inglês (variáveis e funções)
- **Linguagem da UI:** Português brasileiro
- **Componentes:** Uma página por arquivo, sem subcomponentes
- **Estado:** React hooks (`useState`, `useEffect`) + Context API
- **Estilização:** Inline styles + CSS classes utilitárias
- **Git:** Commits em inglês com prefixo (`fix:`, `feat:`, `refactor:`)
