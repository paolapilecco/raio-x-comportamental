# Raio-X Comportamental — PRD / Manual do Projeto

> Sistema de Leitura Comportamental e Análise de Padrões Profundos

**URL publicada:** https://raio-x-comportamental.lovable.app  
**Última atualização:** 2026-04-07

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
│   ├── admin/              # Painéis administrativos
│   │   ├── AIConfigPanel.tsx        # Config de IA (global/módulo)
│   │   ├── HistoryPanel.tsx         # Histórico de prompts
│   │   ├── OutputRulesPanel.tsx     # Regras de saída do relatório
│   │   ├── PromptEditor.tsx         # Editor de prompts por tipo
│   │   ├── QuestionsPanel.tsx       # Geração/gestão de perguntas com IA
│   │   ├── ReportTemplatePanel.tsx  # Template de relatório + preenchimento IA
│   │   ├── SimulationPanel.tsx      # Simulação de diagnóstico
│   │   └── promptConstants.ts       # Constantes de prompts
│   ├── diagnostic/         # Componentes da leitura
│   │   ├── AnalyzingScreen.tsx      # Tela de processamento
│   │   ├── LandingHero.tsx          # Hero da landing
│   │   ├── LifeMapComparison.tsx    # Comparação de mapas de vida
│   │   ├── LifeMapReport.tsx        # Relatório do mapa de vida
│   │   ├── Questionnaire.tsx        # Questionário dinâmico
│   │   └── Report.tsx               # Relatório de resultados
│   ├── skeletons/          # Loading skeletons
│   └── ui/                 # shadcn/ui components
├── contexts/
│   └── AuthContext.tsx      # Autenticação + roles + proteção de rotas
├── data/                   # Padrões comportamentais (fallback estático)
│   ├── emotionalPatterns.ts
│   ├── executionPatterns.ts
│   ├── hiddenPatterns.ts
│   ├── moneyPatterns.ts
│   ├── patterns.ts         # Padrão comportamental base (8 eixos)
│   ├── purposePatterns.ts
│   ├── purposeQuestions.ts
│   ├── relationshipPatterns.ts
│   ├── selfImagePatterns.ts
│   └── questions.ts        # Perguntas do teste base
├── hooks/
│   ├── useAxisLabels.ts           # Labels dinâmicos (DB + fallback)
│   ├── usePatternDefinitions.ts   # Definições de padrões do DB
│   └── use-mobile.tsx             # Detecção mobile
├── lib/
│   ├── analysis.ts              # Motor de análise do teste base
│   ├── centralProfile.ts        # Perfil central unificado (multi-teste)
│   ├── conflictDetection.ts     # Detecção de conflitos entre eixos
│   ├── generateLifeMapPdf.ts    # PDF do Mapa de Vida
│   ├── generatePdf.ts           # PDF do relatório
│   ├── genericAnalysis.ts       # Motor genérico (option_scores + normalização)
│   ├── interpretationEngine.ts  # Motor de interpretação neurocientífica
│   ├── lifeMapActions.ts        # Ações do Mapa de Vida
│   ├── purposeAnalysis.ts       # Análise de propósito
│   ├── reportAssembler.ts       # Montagem do relatório via template
│   ├── reportQualityValidator.ts # Validação de qualidade do relatório
│   ├── scoreNormalization.ts    # Normalização de scores (piso visual 20%)
│   ├── testEngineRegistry.ts    # Registro de motores por slug
│   └── utils.ts
├── pages/                  # 21 páginas
├── types/                  # TypeScript types (diagnostic.ts, purpose.ts)
└── integrations/           # Lovable Cloud client (auto-gerado)

supabase/
├── functions/              # 10 Edge Functions
│   ├── admin-users/
│   ├── analyze-test/
│   ├── asaas-checkout/
│   ├── asaas-status/
│   ├── asaas-webhook/
│   ├── generate-insights/
│   ├── generate-prompt/
│   ├── generate-questions/
│   ├── generate-template/
│   └── suggest-question-config/
└── config.toml
```

---

## 📱 Páginas e Rotas

| Rota | Página | Acesso | Descrição |
|------|--------|--------|-----------|
| `/` | Index | Público | Landing page |
| `/auth` | Auth | Público | Login / Cadastro / Google OAuth |
| `/reset-password` | ResetPassword | Público | Redefinição de senha |
| `/onboarding` | Onboarding | Autenticado | Configuração de perfil (nome, nascimento, CPF) |
| `/tests` | TestCatalog | Autenticado | Catálogo de leituras disponíveis |
| `/diagnostic/:slug` | Diagnostic | Autenticado | Realizar uma leitura comportamental |
| `/dashboard` | Dashboard | Autenticado | Painel principal com resumo |
| `/history` | DiagnosticHistory | Autenticado | Histórico de leituras realizadas |
| `/central-report` | CentralReport | Autenticado | Relatório central unificado (multi-teste) |
| `/premium` | Premium | Autenticado | Página do plano premium |
| `/checkout` | Checkout | Autenticado | Pagamento via Asaas |
| `/profile` | Profile | Autenticado | Perfil do usuário |
| `/admin` | AdminDashboard | Super Admin | Painel administrativo |
| `/admin/prompts` | AdminPrompts | Super Admin | Central de prompts, perguntas e templates |
| `/admin/ai-config` | AdminAIConfig | Super Admin | Configuração de IA (global e por módulo) |
| `/admin/questions` | AdminQuestions | Super Admin | Gerenciamento de perguntas |
| `/admin/users` | AdminUsers | Super Admin | Gerenciamento de usuários |
| `/admin/subscriptions` | AdminSubscriptions | Super Admin | Gerenciamento de assinaturas |
| `/admin/test-modules` | AdminTestModules | Super Admin | Gerenciamento de módulos |
| `/admin/roadmap` | AdminRoadmap | Super Admin | Roadmap do projeto |

---

## 🗄️ Banco de Dados

### Tabelas Principais (21 tabelas)
| Tabela | Função |
|--------|--------|
| `profiles` | Dados do usuário (nome, data nascimento, CPF, idade) |
| `user_roles` | Roles: user, premium, admin, super_admin |
| `test_modules` | Módulos de leitura (slug, nome, descrição, ícone, categoria) |
| `questions` | Perguntas por módulo com `option_scores`, `axes`, `weight`, `type` |
| `pattern_definitions` | Definições de padrões (label, mechanism, triggers, exit_strategy) |
| `diagnostic_sessions` | Sessões de leitura (user_id, test_module_id, completed_at) |
| `diagnostic_answers` | Respostas do usuário (imutáveis após submissão) |
| `diagnostic_results` | Resultados processados (scores, padrões, diagnóstico) |
| `test_prompts` | Prompts de IA por módulo e tipo (7 tipos de prompt) |
| `prompt_history` | Histórico de alterações em prompts |
| `prompt_generation_history` | Histórico de geração com IA |
| `report_templates` | Templates de relatório (sections + output_rules) |
| `admin_prompts` | Prompts administrativos contextuais |
| `global_ai_config` | Config global de IA (modelo, temperatura, tokens, tom, estilo) |
| `test_ai_config` | Config de IA por módulo (override do global) |
| `user_central_profile` | Perfil central agregado (multi-teste) |
| `user_profile` | Perfil emocional/comportamental |
| `subscriptions` | Assinaturas (plano mensal/anual, status, Asaas IDs) |
| `plan_change_history` | Histórico de mudanças de plano |
| `roadmap_tasks` | Tarefas do roadmap (com realtime) |
| `tests` / `test_results` | Testes e resultados (legado) |

### Enums do Banco
| Enum | Valores |
|------|---------|
| `app_role` | admin, user, premium, super_admin |
| `prompt_type` | interpretation, diagnosis, profile, core_pain, triggers, direction, restrictions |
| `question_type` | likert, behavior_choice, frequency, intensity |
| `subscription_plan` | monthly, yearly |
| `subscription_status` | pending, active, overdue, canceled, expired |

### Segurança do Banco
- **RLS habilitado** em todas as tabelas
- **Roles via tabela dedicada** `user_roles` (nunca no perfil)
- **Função `has_role()`** — SECURITY DEFINER com search_path fixo
- **Triggers automáticos**: role `user` no signup + admin para emails autorizados
- **Respostas imutáveis**: `diagnostic_answers` não permite UPDATE (by design)
- **Mensagens de erro genéricas** — erros internos nunca expostos ao cliente
- **HIBP Check** — proteção contra senhas vazadas

---

## 🔐 Autenticação

### Métodos
1. **Email + Senha** — validação Zod (email max 255, senha min 6)
2. **Google OAuth** — via Lovable Cloud (funciona apenas no site publicado)
3. **Recuperação de senha** — link por email com redirecionamento

### Sistema de Roles
| Role | Permissões |
|------|-----------|
| `user` | Acesso básico, leituras gratuitas |
| `premium` | Acesso a conteúdo premium + tudo de user |
| `admin` | Gestão parcial |
| `super_admin` | Gerenciamento total (prompts, módulos, usuários, IA) |

### Admins autorizados por email
- `paolabem@gmail.com`
- `trafegocomkrisan@gmail.com`

---

## ⚡ Edge Functions (Backend)

| Função | Descrição | Validação |
|--------|-----------|-----------|
| `analyze-test` | Processa respostas com IA para gerar diagnósticos estruturados | Input validation (testName, scores) |
| `generate-insights` | Gera insights adicionais baseados nos resultados | Auth check |
| `generate-prompt` | Gera prompts com IA para o admin | Admin only |
| `generate-questions` | Gera perguntas inteligentes com IA | Input validation + deduplicação |
| `generate-template` | Gera template de relatório com IA (com preenchimento contextual) | Admin only |
| `suggest-question-config` | Sugere configuração ideal de perguntas via IA | Admin only |
| `admin-users` | Gestão de usuários (listar, alterar roles) | Super admin only |
| `asaas-checkout` | Criação de checkout no Asaas (pagamento) | Auth + CPF validation |
| `asaas-status` | Consulta de status de pagamento | Auth check |
| `asaas-webhook` | Recebe webhooks do Asaas para atualizar assinaturas | Webhook validation |

---

## 📊 Motor de Pontuação

### Cálculo de Porcentagem por Eixo
1. **Com `option_scores`** (ex: `[0, 25, 50, 75, 100]`):
   - O índice da resposta (0-based) é mapeado para o valor real do score
   - Ex: opção 4 → `option_scores[3]` = 75 pontos
   - Max por pergunta = `Math.max(...option_scores)` (geralmente 100)
2. **Likert sem option_scores**:
   - Normalizado 1-5 → 0-4 (subtraindo 1)
   - Max por pergunta = 4
3. **Intensity**: valor 0-10 direto (max=10)
4. **Porcentagem final**: `(somaScores / somaMaxScores) * 100`, capped em 100%
5. **Normalização visual**: padrões ativos (≥15%) recebem piso de 20% no radar

### Pipeline de Análise
```
Respostas → Mapeamento option_scores → Soma por eixo → Percentual →
→ Normalização visual → Interpretação neurocientífica →
→ Validação de qualidade → Relatório final
```

### Geração Inteligente de Perguntas (IA)
A edge function `generate-questions` implementa:
1. **Análise contextual**: carrega prompts, template e padrões do módulo antes de gerar
2. **Deduplicação**: compara com perguntas existentes do mesmo teste e de outros testes
3. **Perguntas invertidas**: 20-30% reverse-scored para validação cruzada
4. **Cruzamento obrigatório de eixos**: ≥40% das perguntas tocam 2+ eixos
5. **Cobertura total**: valida que todos os eixos do módulo são cobertos
6. **Alinhamento com relatório**: perguntas desenhadas para alimentar as seções do template
7. **Validação de `option_scores`**: cada pergunta inclui valores de score por opção

### Template de Relatório (preenchimento com IA)
- Botão "Preencher com IA" analisa prompts e perguntas existentes
- Gera seções e output_rules contextualizadas automaticamente
- Respeita o tipo de diagnóstico e seus eixos específicos

---

## 📲 PWA (App Instalável)

- **Sem service worker** (evita conflitos com preview do Lovable)
- **Manifest.json** configurado com ícones e metadados
- **Meta tags** Apple Web App para iOS
- Instalação: Compartilhar → Adicionar à Tela Início (iOS) ou menu do navegador (Android)

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

## 🔧 Fluxo Admin: Central de Prompts

### Ordem recomendada de uso
1. **Prompts** → Configurar/gerar prompts de IA por tipo (interpretação, diagnóstico, etc.)
2. **Perguntas** → Gerar perguntas com IA (usa prompts + contexto do módulo)
3. **Template** → Preencher template com IA (usa prompts + perguntas como contexto)
4. **Output Rules** → Definir regras de formatação do relatório
5. **Simulação** → Testar o diagnóstico completo

### Tipos de Prompt (7)
| Tipo | Função |
|------|--------|
| `interpretation` | Como interpretar os scores dos eixos |
| `diagnosis` | Como gerar o diagnóstico comportamental |
| `profile` | Como nomear o perfil do usuário |
| `core_pain` | Como identificar a dor central |
| `triggers` | Como identificar gatilhos e armadilhas |
| `direction` | Como gerar direcionamentos de saída |
| `restrictions` | O que NÃO fazer / orientações negativas |

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
9. **Option scores** mapeados corretamente via índice (bug corrigido em 2026-04-07)
10. **Geração de perguntas** com deduplicação, inversão e cruzamento de eixos obrigatório
11. **Template de relatório** preenchível automaticamente com IA contextual
