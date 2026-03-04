# Product Roadmap - Colorindo App

Este documento descreve as fases de planejamento, objetivos alcançados e marcos futuros para a evolução do Colorindo Engine.

---

## 🟢 Fase 1: Fundação & Pipeline (Concluído)
Foco na criação do motor de geração e estabilização do fluxo de IA.
- [x] **MVP do Pipeline IA:** Integração com Kie.ai (Character, Cover, Scenes).
- [x] **Conversão PDF:** Integração com PDF.co para geração de arquivos prontos para impressão.
- [x] **Arquitetura Webhook:** Transição de Polling para Webhooks para maior eficiência.
- [x] **Resiliência:** Implementação de fallbacks de upscale e recuperação de erros no frontend.
- [x] **Multitenancy B2B:** Estrutura de Accounts, Profiles e controle de créditos por conta.

---

## 🟡 Fase 2: Segurança & Escala (Em Andamento)
Foco em tornar o sistema pronto para produção comercial e múltiplos clientes.
- [ ] **Endurecimento de Segurança:**
    - Implementação de secretos nos Webhooks.
    - Validação rigorosa de JWT em todas as Edge Functions.
    - Correção de `search_path` em funções SQL.
- [ ] **Gestão B2B Avançada:**
    - Dashboard de métricas para Managers (uso de créditos, tempo de geração).
    - Sistema de logs de auditoria para ações administrativas.
- [ ] **Otimização de Custos:**
    - Implementação de cache de prompts e imagens base para temas frequentes.

---

## 🔵 Fase 3: User Experience & Expansão (Próximos Passos)
Aperfeiçoamento do produto final e novas funcionalidades de criação.
- [ ] **Editor de Storyboard:** Interface para o usuário ajustar prompts de cenas específicas antes da geração final.
- [ ] **Variedade de Modelos:** Suporte a diferentes estilos artísticos (Cartoon, Realista, Minimalista) via seleção de modelos no Tema.
- [ ] **Internacionalização (i18n):** Suporte total a múltiplos idiomas para expansão fora do mercado BR.
- [ ] **PWA / App Mobile:** Versão otimizada para dispositivos móveis para acompanhamento de pedidos.

---

## 🟣 Fase 4: IA Autônoma & Vídeo (Visão de Longo Prazo)
Exploração de novas fronteiras tecnológicas.
- [ ] **Geração de Vídeo:** Pequenas animações baseadas nas cenas do livro.
- [ ] **IA Writer:** Sugestão automática de roteiros e diálogos baseados no nome e idade da criança.
- [ ] **Impressão Sob Demanda:** Integração direta com gráficas para envio físico automatizado.

---

## Histórico de Versões
- **v1.0.0:** Lançamento do motor baseado em webhooks e B2B core.
- **v0.9.0:** Protótipo funcional com polling e temas fixos.
