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

### 3.1 Autenticação e Multitenancy B2B

- Login com e-mail + senha (Supabase Auth)
- Diferenciador de perfis:
  - `admin`: Administra a plataforma, gerencia contas (clientes), saldo de créditos, e usuários. É o único que cria Temas.
  - `manager` e `user` (Operadores): Vinculados a uma conta (cliente). Consomem apenas o saldo de créditos da conta em que atuam.
- Sistema unificado de **Accounts** (contas/clientes):
  - Contas podem ter 1 ou mais usuários (operadores) vinculados.
  - Projetos são vinculados obrigatoriamente às contas.

### 3.2 Licenças e Lógica de Custo (Nova Monetização)

- A monetização ocorre fora da plataforma (ex: contrato de uso, licença B2B, patrocínios).
- **Créditos:** O Admin registra e gerencia o saldo das contas na plataforma (podendo adicionar ou remover créditos de um cliente via dashboard).
- O usuário (operador) gasta o saldo de sua conta na geração dos pedidos. O débito é cobrado com base na **taxa de uso de cada Tema** (ex: "Livro Dinossauros" custa 12 créditos por livro gerado, valor este fixado proporcionalmente à quantidade de páginas cadastradas pelo Admin).

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

O pipeline é o coração do sistema. Executa 8 etapas lógicas, representadas de forma encadeada no frontend, porém com otimização paralela (Fase 2):

| Etapa | Nome | Motor | Descrição |
|-------|------|-------|-----------|
| 1 | **Personagem** | Kie.ai (nano-banana-pro) | Gera avatar cartoon baseado na foto |
| 2 | **Aprovação 1** | Usuário | Operador aprova/rejeita o personagem, disparando a Fase 2 |
| 3 | **Capa do Livro** | Kie.ai (nano-banana-pro) | Gera capa (disparado em paralelo com as cenas) |
| 4 | **Aprovação 2** | Usuário | Operador aprova/rejeita a capa |
| 5 | **Cenas do Livro** | Kie.ai (gpt4o-image) | Gera N cenas paralelas do tema simultaneamente à capa |
| 6 | **Alta Resolução** | Kie.ai (nano-banana-upscale) | Upscale 2x automático após a conclusão das imagens |
| 7 | **Conversão PDF** | PDF.co API | Converte imagens em PDFs (capa + miolo) separados |
| 8 | **Conclusão** | Sistema | Upload de PDFs no Storage + status `review` |

**Resiliência:**
- Fallback automático: se upscale falhar, usa imagem original
- Polling do frontend a cada 12s para avançar etapas
- Auto-invocação recursiva entre Edge Functions (upscale → PDF)
- Bypass de JWT para chamadas internas via `SUPABASE_SERVICE_ROLE_KEY`

### 3.5 Biblioteca Diretiva de Temas (Apenas Admin)

- Criação (CRUD) de temas e cenas **restrita aos administradores**.
- Os temas criados podem ser vinculados a projetos específicos (uso exclusivo de um cliente) ou disponibilizados globalmente.
- Cada tema define um **preço de taxa de uso (custo em créditos para ser gerado)**, descrição, cenas (array JSON), e imagens de referência.
- Prompts com variáveis dinâmicas: `{nome}`, `{idade}`, `{genero}`.
- Contagem de uso (pedidos vinculados por tema).

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
| **Backend / API** | Supabase Edge Functions / Backend Workers | Migração progressiva para processamento em Fila/Jobs (Ex: RabbitMQ/QStash) ao em vez de rotas síncronas |
| **Database** | PostgreSQL (Supabase) | Estrutura relacional escalável, RLS habilitado |
| **Auth** | Supabase Auth | Email/password, JWT tokens |
| **Storage** | Supabase Storage | Buckets segmentados por assets (`order_assets`) e PDFs finais |
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

### 6.1 Operador (manager/user)

1. Acessa a página principal (Dashboard de Pedidos) utilizando o menu "USUÁRIO".
2. **Inicia um Pedido:** Clica no botão "Novo Pedido" na dashboard ou navega até a seção "Temas", escolhe um tema e clica gerar novo pedido.
3. No formulário de novo pedido, seleciona um dos **Projetos disponíveis** vinculados ao seu usuário, escolhe o tema e insere a foto e dados da criança.
4. Acompanha o pipeline de geração das imagens em tempo real.
5. Aprova o personagem (etapa 2) e a capa (etapa 4).
6. Aguarda a conclusão automática das demais etapas.
7. Baixa os PDFs: Capa + Miolo (botões na tela de detalhes).

### 6.2 Administrador e Gerente (admin / manager)

1. Acessam as opções exclusivas de gestão via seção lateral "ADMIN" (Projetos, Biblioteca de Temas, Pipeline, Master Prompts, Usuários).
2. **Gestão de Projetos:** Criação e monitoramento de projetos (lotes/campanhas) visíveis apenas para níveis de admin e gerentes.
3. **Cria Projetos** atrelando-os à uma conta de cliente existente.
4. **Vincula usuários (operadores)** às respectivas Contas e Projetos, disponibilizando a base para a criação dos pedidos avulsos (vide item 6.1).
5. Cria/edita os Temas na "Biblioteca de Temas" definindo restrições globais ou exclusivas (Exclusivo para Admin).
6. Gerencia **master prompts globais** (Admin).
7. Gerencia a injeção do saldo de créditos das contas (Admin).

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

## 8. Roadmap de Negócios, Arquitetura e Escalabilidade

### 8.1 Melhorias de Backend e Escala (Fase 2)
- [ ] **Conversão do Polling para Supabase Realtime / Webhooks:** Remover o polling agressivo de 12s no frontend do processo de pipeline para reduzir custos e carga, utilizando Webhooks via Supabase Realtime para notificar assincronamente a UI quando uma geração termina.
- [ ] **Job Queues (Fila de Tarefas) e Workers Estáveis:** Substituir ou estender as Edge Functions na fase do Core Pipeline em uma fila dedicada e duradoura (como as do *BullMQ*, *Inngest* ou *Upstash*) para impedir timeouts e garantir processamento maciço sob demanda e resiliência a interrupções.
- [ ] **Idempotência no Pipeline (`pipeline_steps`):** Criar uma tabela transacional rigorosa detalhando o sucesso (retry, rastreabilidade e debug) individual de cada Cena, Capa e Upscale, precavendo a perda de créditos em processos fraturados.
- [ ] **Camada de Auditoria (`order_events`):** Inserir logs rigorosos e detalhados de payload a cada mutação e aprovação de livros (rastreio de debugging escalável).
- [ ] **Bucket Otimizado (`order_assets`):** Transicionar a organização global de arquivos para caminhos restritos ao invés de pools caóticos (ex: `orders/{order_id}/cover` em vez de apenas nomes longos na raiz).
- [ ] **Deduplicação Inteligente (Hash de Fotos):** Implementar e salvar o *hash* das imagens fornecidas para que não ocorram envios e armazenamentos duplicativos em escala de turmas e campanhas LGPD.

### 8.2 Roadmap Funcional B2B Avançado
- [ ] Rateio Dinâmico de Créditos: Motor que valida o saldo da conta e debita a 'taxa de uso' configurada individualmente dentro do CRUD de Temas e multiplicável pela Tabela `theme_costs` (onde cada cena exibe um custo modular).
- [ ] Gestão Global de Contas B2B: Interface para o super administrador (`Admin`) listar, buscar e controlar todas as "Accounts" cadastradas. Inclui gerenciar a Cota de Projetos criados, alterar o Status da conta (Ativa/Inativa) e recarregar os Créditos.
- [ ] Indicador Visual de Saldo (Dropdown Conta): Componente na interface para que o Operador/Admin verifique a conta selecionada, exibindo selos visuais e saldo volumétrico de moedas.
- [ ] Upload em lote via CSV/Excel
- [ ] Relatórios e Analytics Administrativos: Dashboard para o Admin monitorar de forma holística o sistema. 
  - Levantamento de créditos consumidos por Conta e por Projeto.
  - Extrato detalhado de custos operacionais (cruzar a tabela de precificação Modular `theme_costs` com gastos com Kie.ai e PDF.co).
  - Listagem dos temas de maior adesão e lucratividade.
- [ ] Exportação ZIP de todos os PDFs de um projeto (Para as escolas/editoras receberem a campanha fechada).
- [ ] API pública B2B para integrações com sistemas externos (ex: um editor que consuma o backend por fora).
- [ ] Biblioteca de Imagens (Assets): Criar galeria onde se gerencia recursos recorrentes (disponível para Admin/Manager). 
- [ ] Editor de Layout de Capa Dinâmico (Apenas Admin): O Admin cria composições paras capas no sistema permitindo carregar bases visuais diretas da plataforma.

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
