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
├── components/
│   ├── admin/              # Painéis administrativos (Prompts, IA, Perguntas, Template, etc.)
│   ├── diagnostic/         # Componentes da leitura (Hero, Questionário, Relatório, LifeMap)
│   ├── skeletons/          # Loading skeletons (Dashboard, Profile, etc.)
│   └── ui/                 # shadcn/ui components
├── contexts/               # AuthContext (autenticação + roles)
├── data/                   # Padrões comportamentais por categoria
│   ├── emotionalPatterns.ts
│   ├── executionPatterns.ts
│   ├── hiddenPatterns.ts
│   ├── moneyPatterns.ts
│   ├── patterns.ts         # Padrão comportamental base
│   ├── purposePatterns.ts
│   ├── purposeQuestions.ts
│   ├── relationshipPatterns.ts
│   ├── selfImagePatterns.ts
│   └── questions.ts        # Perguntas do teste base
├── hooks/
│   ├── useAxisLabels.ts    # Labels dinâmicos para eixos (DB + fallback)
│   ├── usePatternDefinitions.ts
│   └── use-mobile.tsx
├── lib/
│   ├── analysis.ts              # Motor de análise do teste base
│   ├── centralProfile.ts        # Perfil central unificado
│   ├── conflictDetection.ts     # Detecção de conflitos entre eixos
│   ├── generateLifeMapPdf.ts    # PDF do Mapa de Vida
│   ├── generatePdf.ts           # PDF do relatório
│   ├── genericAnalysis.ts       # Motor genérico para testes dinâmicos
│   ├── interpretationEngine.ts  # Motor de interpretação neurocientífica
│   ├── lifeMapActions.ts        # Ações do Mapa de Vida
│   ├── purposeAnalysis.ts       # Análise de propósito
│   ├── reportAssembler.ts       # Montagem do relatório via template
│   ├── reportQualityValidator.ts # Validação de qualidade do relatório
│   ├── scoreNormalization.ts    # Normalização de scores (piso visual 20%)
│   ├── testEngineRegistry.ts    # Registro de motores por slug
│   └── utils.ts
├── pages/                  # Páginas da aplicação
├── types/                  # TypeScript types
└── integrations/           # Lovable Cloud client
supabase/
├── functions/              # Edge Functions (backend)
│   ├── admin-users/        # Gestão de usuários (admin)
│   ├── analyze-test/       # Análise com IA
│   ├── asaas-checkout/     # Checkout de pagamento (Asaas)
│   ├── asaas-status/       # Status de pagamento
│   ├── asaas-webhook/      # Webhook de pagamento
│   ├── generate-insights/  # Geração de insights
│   ├── generate-prompt/    # Geração de prompts com IA
│   ├── generate-questions/ # Geração de perguntas com IA
│   ├── generate-template/  # Geração de template de relatório com IA
│   └── suggest-question-config/ # Sugestão de config de perguntas
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
| `/checkout` | Checkout | Autenticado | Pagamento |
| `/profile` | Profile | Autenticado | Perfil do usuário |
| `/admin` | AdminDashboard | Super Admin | Painel administrativo |
| `/admin/prompts` | AdminPrompts | Super Admin | Gerenciamento de prompts, perguntas e templates |
| `/admin/ai-config` | AdminAIConfig | Super Admin | Configuração de IA (global e por módulo) |
| `/admin/questions` | AdminQuestions | Super Admin | Gerenciamento de perguntas |
| `/admin/users` | AdminUsers | Super Admin | Gerenciamento de usuários |
| `/admin/subscriptions` | AdminSubscriptions | Super Admin | Gerenciamento de assinaturas |
| `/admin/test-modules` | AdminTestModules | Super Admin | Gerenciamento de módulos |
| `/admin/roadmap` | AdminRoadmap | Super Admin | Roadmap do projeto |

---

## 🗄️ Banco de Dados

### Tabelas Principais
| Tabela | Função |
|--------|--------|
| `profiles` | Dados do usuário (nome, data nascimento, CPF, idade) |
| `user_roles` | Roles: user, premium, admin, super_admin |
| `test_modules` | Módulos de leitura disponíveis |
| `questions` | Perguntas por módulo (suporta likert, behavior_choice, frequency, intensity) |
| `pattern_definitions` | Definições de padrões comportamentais por módulo |
| `diagnostic_sessions` | Sessões de leitura |
| `diagnostic_answers` | Respostas do usuário (imutáveis) |
| `diagnostic_results` | Resultados processados |
| `test_prompts` | Prompts de IA por módulo (interpretation, diagnosis, profile, etc.) |
| `prompt_history` | Histórico de alterações em prompts |
| `prompt_generation_history` | Histórico de geração com IA |
| `report_templates` | Templates de relatório por módulo |
| `admin_prompts` | Prompts administrativos |
| `global_ai_config` | Configurações globais de IA |
| `test_ai_config` | Configurações de IA por módulo |
| `user_central_profile` | Perfil central agregado |
| `user_profile` | Perfil emocional/comportamental |
| `subscriptions` | Assinaturas (plano, status, Asaas) |
| `plan_change_history` | Histórico de mudanças de plano |
| `roadmap_tasks` | Tarefas do roadmap do projeto |
| `tests` / `test_results` | Testes e resultados (legado) |

### Segurança
- **RLS habilitado** em todas as tabelas
- **Roles via tabela dedicada** `user_roles` (nunca no perfil)
- **Função `has_role()`** para verificação segura (SECURITY DEFINER com search_path fixo)
- **Triggers automáticos**: atribuição de role `user` no signup, admin para emails autorizados
- **Mensagens de erro genéricas** — erros internos nunca expostos ao cliente
- **HIBP Check** — proteção contra senhas vazadas

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
| `admin` | Gestão parcial |
| `super_admin` | Gerenciamento total (prompts, módulos, usuários, etc.) |

### Admins autorizados por email
- `paolabem@gmail.com`
- `trafegocomkrisan@gmail.com`

---

## ⚡ Edge Functions (Backend)

| Função | Descrição |
|--------|-----------|
| `analyze-test` | Processa respostas usando IA para gerar diagnósticos estruturados |
| `generate-insights` | Gera insights adicionais baseados nos resultados |
| `generate-prompt` | Gera prompts com IA para o admin |
| `generate-questions` | Gera perguntas com IA (com deduplicação, inversão, cruzamento de eixos) |
| `generate-template` | Gera template de relatório com IA |
| `suggest-question-config` | Sugere configuração de perguntas via IA |
| `admin-users` | Gestão de usuários pelo admin |
| `asaas-checkout` | Criação de checkout no Asaas |
| `asaas-status` | Consulta de status de pagamento |
| `asaas-webhook` | Recebe webhooks do Asaas para atualizar assinaturas |

---

## 📊 Motor de Pontuação

### Cálculo de Porcentagem por Eixo
1. **Com `option_scores`** (ex: `[0, 25, 50, 75, 100]`): resposta mapeada pelo índice para o valor real do score
2. **Likert sem option_scores**: normalizado 1-5 → 0-4 (max=4)
3. **Intensity**: valor 0-10 direto (max=10)
4. **Porcentagem**: `(score / maxScore) * 100`, capped em 100%
5. **Normalização visual**: padrões ativos (≥15%) recebem piso de 20% no radar

### Métricas de Qualidade de Perguntas
- 20-30% de perguntas invertidas (reverse-scored)
- ≥40% de perguntas com cruzamento de eixos
- Deduplicação interna automática
- Validação de cobertura total dos eixos

---

## 📲 PWA (App Instalável)

O app é instalável como PWA (Progressive Web App):
- **Sem service worker** (evita conflitos com preview do Lovable)
- **Manifest.json** configurado com ícones e metadados
- **Meta tags** Apple Web App para iOS
- Instalação via: Compartilhar → Adicionar à Tela Início (iOS) ou menu do navegador (Android)

---

## 🧪 Módulos de Leitura Comportamental

| Slug | Módulo | Eixos |
|------|--------|-------|
| `padrao-comportamental` | Padrão Comportamental (gratuito) | 8 eixos base |
| `execucao-produtividade` | Execução & Produtividade | Execução, consistência, evitação |
| `emocoes-reatividade` | Emoções & Reatividade | Regulação, ansiedade, reatividade |
| `relacionamentos-apego` | Relacionamentos & Apego | Apego, comunicação, limites |
| `autoimagem-identidade` | Autoimagem & Identidade | Autocrítica, percepção, valor |
| `dinheiro-decisao` | Dinheiro & Decisão | Escassez, abundância, controle |
| `padroes-ocultos` | Padrões Ocultos | Mecanismos inconscientes |
| `proposito-sentido` | Propósito & Sentido | Pilares de vida |

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
5. **Eixos específicos** por módulo — cada análise usa apenas eixos pertinentes ao tema
6. **Labels de eixos** gerenciados via hook `useAxisLabels` com dados do banco + fallback estático
7. **Conflitos comportamentais** detectados automaticamente via `conflictDetection.ts`
8. **Relatórios** validados por `reportQualityValidator.ts` antes de exibição
