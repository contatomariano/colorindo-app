# Colorindo Engine 🎨

Plataforma SaaS B2B para geração automatizada de livros infantis personalizados de colorir usando inteligência artificial.

## 📖 Documentação

| Documento | Descrição |
|-----------|-----------|
| [docs/README.md](docs/README.md) | **Quick context** para LLMs e desenvolvedores |
| [docs/PRD.md](docs/PRD.md) | Product Requirements Document completo |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Documentação técnica (schema, APIs, deploy) |

## ⚡ Quick Start

```bash
# Instalar dependências
npm install

# Rodar dev server
npm run dev

# Deploy Edge Functions
npx supabase functions deploy generate-book --project-ref prhlccqaqfksbrxngkek --no-verify-jwt
```

## Stack

- **Frontend:** React 18 + Vite 5
- **Backend:** Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **IA:** Kie.ai API (geração de imagens + upscale)
- **PDF:** PDF.co API
- **Hosting:** Vercel
