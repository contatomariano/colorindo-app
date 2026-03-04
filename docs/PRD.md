# PRD — Colorindo Engine

**Versão:** 1.0  
**Data:** 03/03/2026  
**Autor:** Fernando Mariano / Colorindo  

---

## 1. Visão Geral do Produto

**Colorindo Engine** é uma plataforma SaaS B2B para geração automatizada de livros infantis personalizados de colorir, utilizando inteligência artificial. O sistema permite que operadores (escolas, editoras, patrocinadores) criem pedidos em lote com dados de crianças reais e recebam PDFs prontos para impressão — cada livro com personagem exclusivo baseado na foto da criança.

### 1.1 Problema

Empresas que produzem livros personalizados para crianças enfrentam:
- Alto custo com ilustradores para personalização individual
- Tempo de produção inviável para grandes lotes (escolas com 500+ alunos)
- Falta de escalabilidade nas soluções artesanais atuais

### 1.2 Solução

Uma plataforma que automatiza todo o pipeline:
1. Recebe foto + dados da criança
2. Gera personagem cartoon via IA
3. Gera capa personalizada
4. Gera cenas do livro (páginas internas)
5. Aplica upscale de alta resolução
6. Converte em PDFs (capa + miolo) prontos para gráfica

---

## 2. Público-Alvo

| Segmento | Descrição | Uso Típico |
|----------|-----------|------------|
| **Escolas / Creches** | Instituições de ensino que distribuem livros aos alunos | Lotes de 50-500 livros por campanha |
| **Editoras Infantis** | Empresas que produzem livros sob demanda | Produção contínua personalizada |
| **Patrocinadores / Marcas** | Empresas que patrocinam livros como brinde corporativo | Campanhas promocionais sazonais |
| **Municípios / ONGs** | Programas governamentais de incentivo à leitura | Distribuição em massa |

---

## 3. Funcionalidades Core

### 3.1 Autenticação e Multitenancy

- Login com e-mail + senha (Supabase Auth)
- Perfis com roles: `admin`, `manager`, `user`, `viewer`
- Sistema de **Accounts** (contas/clientes) com isolamento de dados
- Seletor de conta ativo (admin vê todas, user vê só sua conta)
- Planos com cotas de créditos e projetos

### 3.2 Gestão de Projetos

- CRUD de projetos vinculados a uma conta
- Cada projeto agrupa pedidos de uma campanha
- Status: `active`, `paused`, `completed`, `archived`
- Contagem automática de pedidos do projeto
- Barra de progresso baseada em pedidos concluídos

### 3.3 Gestão de Pedidos (Orders)

- Criação individual ou em lote (batch)
- Dados: nome da criança, idade, gênero, foto, tom de pele, cor do cabelo, tema
- Vinculação obrigatória a um projeto e tema
- Status do pedido: `queued` → `processing` → `review` → `completed` → `delivered`
- Reprocessamento individual em caso de erro

### 3.4 Pipeline de Geração IA (Core Engine)

O pipeline é o coração do sistema. Executa 8 etapas sequenciais:

| Etapa | Nome | Motor | Descrição |
|-------|------|-------|-----------|
| 1 | **Personagem** | Kie.ai (gpt4o-image) | Gera avatar cartoon baseado na foto |
| 2 | **Aprovação 1** | Usuário | Operador aprova/rejeita o personagem |
| 3 | **Capa do Livro** | Kie.ai (gpt4o-image) | Gera capa usando personagem aprovado |
| 4 | **Aprovação 2** | Usuário | Operador aprova/rejeita a capa |
| 5 | **Cenas do Livro** | Kie.ai (gpt4o-image) | Gera N cenas paralelas do tema |
| 6 | **Alta Resolução** | Kie.ai (nano-banana-upscale) | Upscale 2x de todas as imagens |
| 7 | **Conversão PDF** | PDF.co API | Converte imagens em PDFs (capa + miolo) |
| 8 | **Conclusão** | Sistema | Upload para Storage + status `review` |

**Resiliência:**
- Fallback automático: se upscale falhar, usa imagem original
- Polling do frontend a cada 12s para avançar etapas
- Auto-invocação recursiva entre Edge Functions (upscale → PDF)
- Bypass de JWT para chamadas internas via `SUPABASE_SERVICE_ROLE_KEY`

### 3.5 Biblioteca de Temas

- CRUD de temas com prompts de IA por cena
- Cada tema define: descrição, cover, cenas (array JSON), imagens de referência
- Prompts com variáveis dinâmicas: `{nome}`, `{idade}`, `{genero}`
- Status: `active`, `draft`, `archived`
- Contagem de uso (pedidos vinculados por tema)

### 3.6 Master Prompts

- Prompts globais reutilizáveis: `character`, `cover`, `scene`
- Cada master prompt tem: `system_prompt`, `template`, `model_id`
- Permitem ajustar a qualidade e estilo de toda a plataforma centralmente

### 3.7 Configurações Globais

- **Concorrência:** máximo de pedidos processados simultaneamente
- **Créditos:** custo por pedido, renovação mensal
- **Resolução:** dimensões padrão das imagens
- Tabela `settings` key-value com JSON

### 3.8 LGPD e Segurança

- **Expurgo automático:** Fotos das crianças removidas do Storage após 15 dias
- **Edge Function `cron-storage-cleanup`:** Limpa arquivos expirados e mascara dados no banco
- **RLS (Row Level Security):** Habilitado em todas as tabelas
- **JWT Auth:** Validação no frontend, bypass para chamadas internas
- **Dados mascarados:** `child_photo_url`, `character_url` substituídos por `[PURGED]`

### 3.9 Dashboard Administrativo

- Gestão de usuários (CRUD, roles, status)
- Monitoramento de pipeline (pedidos em processamento)
- Biblioteca de temas (CRUD, publicação, duplicação)
- Master prompts (edição de prompts de IA)
- Configurações globais do sistema

---

## 4. Arquitetura Técnica

### 4.1 Stack

| Camada | Tecnologia | Detalhes |
|--------|-----------|----------|
| **Frontend** | React 18 + Vite 5 | SPA com JSX, React Router v7 |
| **Styling** | CSS puro (Vanilla CSS) | Design system com variáveis CSS, glassmorphism |
| **Backend** | Supabase Edge Functions | Deno runtime, TypeScript |
| **Database** | PostgreSQL (Supabase) | 9 tabelas, RLS habilitado |
| **Auth** | Supabase Auth | Email/password, JWT tokens |
| **Storage** | Supabase Storage | Bucket `order_pdfs` para PDFs gerados |
| **IA** | Kie.ai API | Geração de imagens + upscale |
| **PDF** | PDF.co API | Conversão de imagens em PDF |
| **Hosting** | Vercel | Deploy automático via GitHub |

### 4.2 Infraestrutura Supabase

- **Project ID:** `prhlccqaqfksbrxngkek`
- **Region:** South America (sa-east-1)
- **Edge Functions:** 3 (`generate-book`, `cron-storage-cleanup`, `admin-manage-users`)
- **Storage Buckets:** `order_pdfs`

---

## 5. Modelo de Dados

### 5.1 Diagrama de Relacionamentos

```
accounts (1) ──── (N) profiles
    │                    │
    │                    └── plans (N:1)
    │
    ├──── (N) projects ──── (N) orders
    │                              │
    └──── (N) orders ──────────────┤
                                   │
                            themes (1) ──── (N) orders
                              │
                              └──── (N) theme_scenes

settings (standalone key-value)
master_prompts (standalone)
```

### 5.2 Tabelas Principais

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `accounts` | 10 | Contas/clientes (multitenancy) |
| `profiles` | 2 | Perfis de usuários autenticados |
| `plans` | 4 | Planos de assinatura (starter, pro, enterprise, custom) |
| `projects` | 1 | Projetos que agrupam pedidos |
| `orders` | 3 | Pedidos de livros (core) |
| `themes` | 5 | Temas de livros com prompts de cena |
| `theme_scenes` | 0 | Cenas individuais de um tema (não utilizada, scenes_data em themes) |
| `master_prompts` | 3 | Prompts globais de IA (character, cover, scene) |
| `settings` | 4 | Configurações chave-valor do sistema |

---

## 6. Fluxo do Usuário

### 6.1 Operador (user/manager)

1. Login → Dashboard de Pedidos
2. Cria Projeto vinculado à sua conta
3. Cria Pedido(s) dentro do projeto, escolhendo tema e dados da criança
4. Acompanha pipeline em tempo real (8 etapas visuais)
5. Aprova personagem (etapa 2) e capa (etapa 4)
6. Aguarda conclusão automática das demais etapas
7. Baixa PDFs: Capa + Miolo (botões na tela de detalhes)

### 6.2 Administrador (admin)

1. Acessa painel admin (Biblioteca de Temas, Prompts, Configurações, Usuários)
2. Cria/edita temas com cenas e prompts personalizados
3. Gerencia master prompts globais
4. Monitora pipeline de todos os pedidos
5. Gerencia contas e créditos

---

## 7. Requisitos Não-Funcionais

| Requisito | Meta |
|-----------|------|
| **Disponibilidade** | 99.5% (Supabase managed) |
| **Tempo de geração** | < 5 min por livro completo (3 cenas) |
| **Concorrência** | Até 10 pedidos simultâneos |
| **LGPD** | Purga automática de dados pessoais em 15 dias |
| **Responsividade** | Mobile-first com sidebar colapsável |
| **Internacionalização** | Português brasileiro (pt-BR) |

---

## 8. Roadmap Futuro

- [ ] Upload em lote via CSV/Excel
- [ ] Webhook de notificação ao concluir pedido
- [ ] Painel de analytics com métricas de uso
- [ ] Integração com gateways de pagamento
- [ ] Exportação ZIP de todos os PDFs de um projeto
- [ ] API pública para integrações externas
- [ ] Personalização de layout de capa por tema
- [ ] Narração em áudio via IA (text-to-speech)

---

## 9. Glossário

| Termo | Significado |
|-------|------------|
| **Order** | Pedido de um livro individual para uma criança |
| **Theme** | Modelo de livro com cenas e prompts pré-definidos |
| **Scene** | Página interna do livro com prompt e imagem |
| **Pipeline** | Sequência de etapas IA para gerar um livro |
| **Master Prompt** | Prompt global reutilizável por tipo (character/cover/scene) |
| **Account** | Conta/cliente no sistema multitenancy |
| **Upscale** | Aumento de resolução de imagem via IA |
| **Miolo** | Páginas internas do livro (exceto capa) |
