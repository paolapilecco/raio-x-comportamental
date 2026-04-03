# Raio-X Comportamental — Manual do Projeto

> Sistema de Leitura Comportamental e Análise de Padrões Profundos

**URL publicada:** https://raio-x-comportamental.lovable.app

---

## 📋 Visão Geral

O **Raio-X Comportamental** é uma plataforma de análise comportamental que identifica padrões invisíveis que dirigem decisões, travas e repetições dos usuários. Através de leituras estruturadas e inteligência artificial, gera diagnósticos profundos e acionáveis.

### Terminologia Obrigatória
- ❌ Nunca usar: "teste", "questionário", "quiz"
- ✅ Sempre usar: "análise", "leitura comportamental", "diagnóstico de padrão"

---

## 🏗️ Arquitetura Técnica

### Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| Estilização | Tailwind CSS v3 + shadcn/ui |
| Animações | Framer Motion |
| Estado | TanStack React Query |
| Roteamento | React Router v6 |
| Backend | Lovable Cloud (Supabase) |
| PDF | jsPDF |
| Validação | Zod |

### Estrutura de Pastas
```
src/
├── components/         # Componentes reutilizáveis
│   ├── diagnostic/     # Componentes da leitura (Hero, Questionário, Relatório)
│   ├── ui/             # shadcn/ui components
│   └── NavLink.tsx     # Navegação
├── contexts/           # AuthContext (autenticação + roles)
├── data/               # Padrões comportamentais e perguntas
│   ├── emotionalPatterns.ts
│   ├── executionPatterns.ts
│   ├── hiddenPatterns.ts
│   ├── moneyPatterns.ts
│   ├── patterns.ts
│   ├── purposePatterns.ts
│   ├── relationshipPatterns.ts
│   └── selfImagePatterns.ts
├── hooks/              # Custom hooks
├── lib/                # Lógica de análise e utilitários
│   ├── analysis.ts
│   ├── centralProfile.ts
│   ├── generatePdf.ts
│   ├── genericAnalysis.ts
│   ├── purposeAnalysis.ts
│   └── testEngineRegistry.ts
├── pages/              # Páginas da aplicação
├── types/              # TypeScript types
└── integrations/       # Lovable Cloud + Supabase client
supabase/
├── functions/          # Edge Functions (backend)
│   ├── analyze-test/   # Análise com IA
│   └── generate-insights/  # Geração de insights
└── config.toml
```

---

## 📱 Páginas e Rotas

| Rota | Página | Acesso | Descrição |
|------|--------|--------|-----------|
| `/` | Index | Público | Landing page |
| `/auth` | Auth | Público | Login / Cadastro / Google OAuth |
| `/reset-password` | ResetPassword | Público | Redefinição de senha |
| `/onboarding` | Onboarding | Autenticado | Configuração de perfil |
| `/tests` | TestCatalog | Autenticado | Catálogo de leituras disponíveis |
| `/diagnostic/:slug` | Diagnostic | Autenticado | Realizar uma leitura |
| `/dashboard` | Dashboard | Autenticado | Painel principal |
| `/history` | DiagnosticHistory | Autenticado | Histórico de leituras |
| `/central-report` | CentralReport | Autenticado | Relatório central unificado |
| `/premium` | Premium | Autenticado | Plano premium |
| `/profile` | Profile | Autenticado | Perfil do usuário |
| `/admin/prompts` | AdminPrompts | Super Admin | Gerenciamento de prompts |
| `/admin/roadmap` | AdminRoadmap | Super Admin | Roadmap do projeto |

---

## 🗄️ Banco de Dados

### Tabelas Principais
| Tabela | Função |
|--------|--------|
| `profiles` | Dados do usuário (nome, data nascimento, idade) |
| `user_roles` | Roles: user, premium, super_admin |
| `test_modules` | Módulos de leitura disponíveis |
| `questions` | Perguntas por módulo |
| `diagnostic_sessions` | Sessões de leitura |
| `diagnostic_answers` | Respostas do usuário |
| `diagnostic_results` | Resultados processados |
| `test_prompts` | Prompts de IA por módulo |
| `prompt_history` | Histórico de alterações em prompts |
| `admin_prompts` | Prompts administrativos |
| `global_ai_config` | Configurações globais de IA |
| `test_ai_config` | Configurações de IA por módulo |
| `user_central_profile` | Perfil central agregado |
| `user_profile` | Perfil emocional/comportamental |
| `roadmap_tasks` | Tarefas do roadmap do projeto |

### Segurança
- **RLS habilitado** em todas as tabelas
- **Roles via tabela dedicada** `user_roles` (nunca no perfil)
- **Função `has_role()`** para verificação segura (SECURITY DEFINER)
- **Triggers automáticos**: atribuição de role `user` no signup, admin para emails autorizados

---

## 🔐 Autenticação

### Métodos
1. **Email + Senha** — com validação Zod (email max 255, senha min 6)
2. **Google OAuth** — via Lovable Cloud managed auth
3. **Recuperação de senha** — link por email com redirecionamento

### Sistema de Roles
| Role | Permissões |
|------|-----------|
| `user` | Acesso básico, leituras gratuitas |
| `premium` | Acesso a conteúdo premium + tudo de user |
| `super_admin` | Gerenciamento total (prompts, roadmap, etc.) |

### Admins autorizados por email
- `paolabem@gmail.com`
- `trafegocomkrisan@gmail.com`

---

## ⚡ Edge Functions (Backend)

### `analyze-test`
Processa respostas de leituras comportamentais usando IA para gerar diagnósticos.

### `generate-insights`
Gera insights adicionais baseados nos resultados das leituras.

---

## 📲 PWA (App Instalável)

O app é instalável como PWA (Progressive Web App):
- **Sem service worker** (evita conflitos com preview do Lovable)
- **Manifest.json** configurado com ícones e metadados
- **Meta tags** Apple Web App para iOS
- Instalação via: Compartilhar → Adicionar à Tela Início (iOS) ou menu do navegador (Android)

---

## 🧪 Módulos de Leitura Comportamental

Os módulos incluem padrões para:
- **Emocional** — Padrões de gestão emocional
- **Execução** — Padrões de produtividade e ação
- **Dinheiro** — Relação com dinheiro e abundância
- **Relacionamentos** — Padrões relacionais
- **Autoimagem** — Percepção de si mesmo
- **Propósito** — Direção e sentido de vida
- **Padrões ocultos** — Mecanismos inconscientes

---

## 🛠️ Desenvolvimento

### Comandos
```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run test     # Testes com Vitest
```

### Variáveis de Ambiente (automáticas)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Arquivos auto-gerados (NÃO editar)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/integrations/lovable/index.ts`
- `.env`

---

## 📌 Notas Importantes

1. **Login com Google** funciona apenas no site publicado, não no preview do editor
2. **Roles** são sempre verificados via tabela `user_roles` + função `has_role()`, nunca client-side
3. **Prompts de IA** são editáveis pelo super_admin na central de prompts
4. **Roadmap** com persistência em tempo real via tabela `roadmap_tasks`
