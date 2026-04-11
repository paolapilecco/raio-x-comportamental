# Raio-X Comportamental — PRD / Manual do Projeto

> Sistema de Leitura Comportamental e Análise de Padrões Profundos

**URL publicada:** https://raio-x-comportamental.lovable.app  
**Última atualização:** 2026-04-11

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
│   ├── admin/                 # Painéis administrativos (Central de Inteligência)
│   │   ├── AIConfigPanel.tsx          # Config de IA (global/módulo)
│   │   ├── GenerateQuestionsModal.tsx # Modal de geração de perguntas com IA
│   │   ├── HistoryPanel.tsx           # Histórico de prompts e simulações
│   │   ├── ModuleHealthScore.tsx      # Score de saúde do módulo (0-100)
│   │   ├── OutputRulesPanel.tsx       # Regras de saída do relatório
│   │   ├── PromptEditor.tsx           # Editor de prompts por tipo (7 seções)
│   │   ├── PreviewModal.tsx           # Preview de conteúdo gerado
│   │   ├── QuestionEditorPanel.tsx    # Editor individual de pergunta
│   │   ├── QuestionsListPanel.tsx     # Lista de perguntas do módulo
│   │   ├── QuestionsPanel.tsx         # Painel completo de perguntas (CRUD + IA)
│   │   ├── ReportTemplatePanel.tsx    # Template de relatório + preenchimento IA
│   │   ├── SimulationPanel.tsx        # Simulação de diagnóstico com IA
│   │   ├── promptConstants.ts         # Constantes, tipos e seções de prompts
│   │   └── questionConstants.ts       # Constantes de perguntas
│   ├── central-report/        # Relatório central unificado
│   │   ├── AIInsightsSection.tsx      # Insights gerados por IA
│   │   ├── ConflictsSection.tsx       # Conflitos entre padrões
│   │   ├── CriticalAreasSection.tsx   # Áreas críticas identificadas
│   │   ├── NeuralMap.tsx              # Mapa neural visual
│   │   ├── RadarSection.tsx           # Gráfico radar de scores
│   │   ├── ReportMiniKPIs.tsx         # Mini KPIs do relatório
│   │   ├── ScoreGlobalCard.tsx        # Card do score global
│   │   ├── StickyPremiumCTA.tsx       # CTA premium fixo
│   │   ├── SummaryScreen.tsx          # Tela de resumo
│   │   └── TimelineSection.tsx        # Timeline de evolução
│   ├── dashboard/             # Componentes do dashboard
│   │   └── RetestCycleCard.tsx        # Card de ciclo de reteste
│   ├── diagnostic/            # Componentes da leitura
│   │   ├── AnalyzingScreen.tsx        # Tela de processamento
│   │   ├── LandingHero.tsx            # Hero da landing da leitura
│   │   ├── LifeMapComparison.tsx      # Comparação de mapas de vida
│   │   ├── LifeMapReport.tsx          # Relatório do mapa de vida
│   │   ├── Questionnaire.tsx          # Questionário dinâmico
│   │   ├── Report.tsx                 # Relatório de resultados
│   │   └── ReportGamification.tsx     # Gamificação no relatório
│   ├── gamification/          # Sistema de badges e conquistas
│   │   └── BadgeUnlockCelebration.tsx
│   ├── landing/               # Componentes da landing page
│   │   ├── ChecklistSection.tsx
│   │   ├── DualPersonaSection.tsx
│   │   ├── FinalCTASection.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ImageShowcaseSection.tsx
│   │   ├── LandingFooter.tsx
│   │   ├── MethodologySection.tsx
│   │   ├── PainSection.tsx
│   │   ├── PricingSection.tsx
│   │   ├── SocialProofBar.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── ThreeLayersSection.tsx
│   ├── patient/               # Gestão de pacientes (profissional)
│   │   ├── HistoryTab.tsx
│   │   ├── NotesTab.tsx
│   │   ├── OverviewTab.tsx
│   │   ├── RemindersTab.tsx
│   │   └── types.ts
│   ├── skeletons/             # Loading skeletons
│   └── ui/                    # shadcn/ui components (40+ componentes)
├── contexts/
│   └── AuthContext.tsx         # Autenticação + roles + proteção de rotas
├── data/                      # Padrões comportamentais (fallback estático)
│   ├── behavioralPatterns.ts   # Padrão comportamental (8 eixos)
│   ├── emotionalPatterns.ts    # Emoções & reatividade
│   ├── executionPatterns.ts    # Execução & produtividade
│   ├── hiddenPatterns.ts       # Padrões ocultos
│   ├── moneyPatterns.ts        # Dinheiro & decisão
│   ├── patterns.ts             # Padrão base (legado)
│   ├── purposePatterns.ts      # Propósito & sentido
│   ├── purposeQuestions.ts     # Perguntas de propósito
│   ├── questions.ts            # Perguntas do teste base
│   ├── relationshipPatterns.ts # Relacionamentos & apego
│   └── selfImagePatterns.ts    # Autoimagem & identidade
├── hooks/
│   ├── useAxisLabels.ts            # Labels dinâmicos (DB + fallback)
│   ├── useBadges.ts                # Sistema de badges
│   ├── useDiagnosticSessions.ts    # Sessões de diagnóstico
│   ├── useGamification.ts          # Gamificação
│   ├── usePatternDefinitions.ts    # Definições de padrões do DB
│   ├── usePersonGamification.ts    # Gamificação por pessoa
│   ├── useRetestCycle.ts           # Ciclo de reteste
│   ├── useSubscription.ts          # Assinaturas
│   └── use-mobile.tsx              # Detecção mobile
├── lib/
│   ├── analysis.ts                 # Motor de análise do teste base
│   ├── centralProfile.ts           # Perfil central unificado (multi-teste)
│   ├── conflictDetection.ts        # Detecção de conflitos entre eixos
│   ├── generateEvolutionPdf.ts     # PDF de evolução
│   ├── generateLifeMapPdf.ts       # PDF do Mapa de Vida
│   ├── generatePdf.ts              # PDF do relatório
│   ├── genericAnalysis.ts          # Motor genérico (option_scores + normalização)
│   ├── interpretationEngine.ts     # Motor de interpretação neurocientífica
│   ├── lifeMapActions.ts           # Ações do Mapa de Vida
│   ├── moduleConflictRules.ts      # Regras de conflito por módulo
│   ├── planLimits.ts               # Limites por plano de assinatura
│   ├── purposeAnalysis.ts          # Análise de propósito
│   ├── reportAssembler.ts          # Montagem do relatório via template
│   ├── reportQualityValidator.ts   # Validação de qualidade do relatório
│   ├── scoreNormalization.ts       # Normalização de scores (piso visual 20%)
│   ├── testEngineRegistry.ts       # Registro de motores por slug (7 módulos)
│   └── utils.ts
├── pages/                     # 22 páginas
├── types/                     # TypeScript types (diagnostic.ts, purpose.ts)
└── integrations/              # Lovable Cloud client (auto-gerado)

supabase/
├── functions/                 # 13 Edge Functions
│   ├── admin-users/
│   ├── analyze-test/
│   ├── asaas-checkout/
│   ├── asaas-status/
│   ├── asaas-webhook/
│   ├── generate-insights/
│   ├── generate-prompt/
│   ├── generate-questions/
│   ├── generate-template/
│   ├── send-email/
│   ├── submit-public-test/
│   ├── suggest-question-config/
│   └── validate-invite/
└── config.toml
```

---

## 📱 Páginas e Rotas

| Rota | Página | Acesso | Descrição |
|------|--------|--------|-----------|
| `/` | Index | Público | Landing page com seções de dor, metodologia, pricing |
| `/auth` | Auth | Público | Login / Cadastro / Google OAuth |
| `/reset-password` | ResetPassword | Público | Redefinição de senha |
| `/t/:token` | PublicTest | Público | Link público para pacientes responderem leitura |
| `/onboarding` | Onboarding | Autenticado | Configuração de perfil (nome, nascimento, CPF) |
| `/tests` | TestCatalog | Autenticado | Catálogo de leituras disponíveis |
| `/diagnostic/:moduleSlug` | Diagnostic | Autenticado | Realizar uma leitura comportamental |
| `/diagnostic` | Diagnostic | Autenticado | Leitura padrão (sem módulo específico) |
| `/dashboard` | Dashboard | Autenticado | Painel principal com resumo |
| `/history` | DiagnosticHistory | Autenticado | Histórico de leituras realizadas |
| `/central-report` | CentralReport | Autenticado | Relatório central unificado (multi-teste) |
| `/premium` | Premium | Autenticado | Página do plano premium |
| `/checkout` | Checkout | Autenticado | Pagamento via Asaas |
| `/profile` | Profile | Autenticado | Perfil do usuário |
| `/pessoas` | ManagedPersons | Autenticado | Gestão de pacientes/pessoas |
| `/paciente/:personId` | PatientDetail | Autenticado | Detalhe do paciente (notas, histórico, lembretes) |
| `/painel-profissional` | ProfessionalDashboard | Autenticado | Dashboard profissional |
| `/comparar-pacientes` | PatientComparison | Autenticado | Comparação entre pacientes |
| `/admin/dashboard` | AdminDashboard | Super Admin | Painel administrativo |
| `/admin/prompts` | AdminPrompts | Super Admin | Central de Inteligência (Pipeline + Perguntas + Testar) |
| `/admin/test-modules` | AdminTestModules | Super Admin | Gerenciamento de módulos |
| `/admin/questions` | AdminQuestions | Super Admin | Gerenciamento de perguntas |
| `/admin/users` | AdminUsers | Super Admin | Gerenciamento de usuários |
| `/admin/subscriptions` | AdminSubscriptions | Super Admin | Gerenciamento de assinaturas |
| `/admin/emails` | AdminEmails | Super Admin | Logs de emails enviados |
| `/admin/roadmap` | AdminRoadmap | Super Admin | Roadmap do projeto |
| `/admin/ai-config` | → Redirect | — | Redireciona para `/admin/prompts` |

---

## 🗄️ Banco de Dados

### Tabelas Principais (25 tabelas)
| Tabela | Função |
|--------|--------|
| `profiles` | Dados do usuário (nome, data nascimento, CPF, idade) |
| `user_roles` | Roles: user, premium, admin, super_admin |
| `test_modules` | Módulos de leitura (slug, nome, descrição, ícone, categoria, question_count) |
| `questions` | Perguntas por módulo com `option_scores`, `axes`, `weight`, `type`, `context` |
| `pattern_definitions` | Definições de padrões (label, mechanism, triggers, exit_strategy) |
| `diagnostic_sessions` | Sessões de leitura (user_id, test_module_id, person_id, completed_at) |
| `diagnostic_answers` | Respostas do usuário (imutáveis após submissão) |
| `diagnostic_results` | Resultados processados (scores, padrões, diagnóstico completo) |
| `test_prompts` | Prompts de IA por módulo e tipo (7 tipos de prompt) |
| `prompt_history` | Histórico de alterações em prompts (trigger automático) |
| `prompt_generation_history` | Histórico de geração com IA |
| `report_templates` | Templates de relatório (sections + output_rules) |
| `admin_prompts` | Prompts administrativos contextuais |
| `global_ai_config` | Config global de IA (modelo, temperatura, tokens, tom, estilo) |
| `test_ai_config` | Config de IA por módulo (override do global) |
| `user_central_profile` | Perfil central agregado (multi-teste) |
| `user_profile` | Perfil emocional/comportamental |
| `subscriptions` | Assinaturas (plano mensal/anual/profissional, status, Asaas IDs) |
| `plan_change_history` | Histórico de mudanças de plano |
| `managed_persons` | Pacientes gerenciados por profissionais |
| `professional_notes` | Notas de profissionais sobre pacientes |
| `test_invites` | Convites de leitura para pacientes (token único, validade 7 dias) |
| `retest_reminders` | Lembretes de reteste |
| `test_usage` | Controle de uso por módulo/mês (limites por plano) |
| `roadmap_tasks` | Tarefas do roadmap (com realtime) |
| `tests` / `test_results` | Testes e resultados (legado) |
| `email_logs` | Logs de emails enviados via Resend |

### Enums do Banco
| Enum | Valores |
|------|---------|
| `app_role` | admin, user, premium, super_admin |
| `prompt_type` | interpretation, diagnosis, profile, core_pain, triggers, direction, restrictions |
| `question_type` | likert, behavior_choice, frequency, intensity |
| `subscription_plan` | monthly, yearly, profissional |
| `subscription_status` | pending, active, overdue, canceled, expired |

### Funções do Banco (9 functions)
| Função | Tipo | Descrição |
|--------|------|-----------|
| `has_role(_user_id, _role)` | SECURITY DEFINER | Verifica se usuário tem uma role |
| `handle_new_user_role()` | Trigger | Atribui role 'user' em novos cadastros |
| `assign_admin_on_signup()` | Trigger | Atribui super_admin para emails autorizados |
| `calculate_age()` | Trigger | Calcula idade a partir de birth_date |
| `update_updated_at_column()` | Trigger | Atualiza campo updated_at automaticamente |
| `update_question_count()` | Trigger | Sincroniza question_count do módulo |
| `log_prompt_change()` | Trigger | Registra histórico de alterações em prompts |
| `count_managed_persons(_user_id)` | SECURITY DEFINER | Conta pacientes ativos do profissional |
| `increment_test_usage(...)` | SECURITY DEFINER | Incrementa contador de uso com upsert |
| `get_test_usage_count(...)` | SECURITY DEFINER | Consulta uso de teste por período |

### Segurança do Banco
- **RLS habilitado** em todas as tabelas
- **Roles via tabela dedicada** `user_roles` (nunca no perfil)
- **Função `has_role()`** — SECURITY DEFINER com search_path fixo
- **Triggers automáticos**: role `user` no signup + admin para emails autorizados
- **Respostas imutáveis**: `diagnostic_answers` não permite UPDATE (by design)
- **Mensagens de erro genéricas** — erros internos nunca expostos ao cliente
- **HIBP Check** — proteção contra senhas vazadas
- **0 vulnerabilidades ativas** — auditorias constantes confirmam

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
| `generate-template` | Gera template de relatório com IA (preenchimento contextual) | Admin only |
| `suggest-question-config` | Sugere configuração ideal de perguntas via IA | Admin only |
| `admin-users` | Gestão de usuários (listar, alterar roles) | Super admin only |
| `asaas-checkout` | Criação de checkout no Asaas (pagamento) | Auth + CPF validation |
| `asaas-status` | Consulta de status de pagamento | Auth check |
| `asaas-webhook` | Recebe webhooks do Asaas para atualizar assinaturas | Webhook token validation |
| `send-email` | Envio de emails via Resend | Auth check |
| `submit-public-test` | Submissão de leitura via link público (pacientes) | Token validation + single-use |
| `validate-invite` | Valida token de convite para leitura | Token + expiration check |

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

### Motor de Análise por Módulo (`testEngineRegistry.ts`)
Cada módulo possui eixos e definições de padrões específicos:
| Módulo | Registro | Eixos |
|--------|----------|-------|
| padrao-comportamental | behavioralPatterns | BEHAVIORAL_AXES |
| execucao-produtividade | executionPatterns | EXECUTION_AXES |
| emocoes-reatividade | emotionalPatterns | EMOTIONAL_AXES |
| relacionamentos-apego | relationshipPatterns | RELATIONSHIP_AXES |
| autoimagem-identidade | selfImagePatterns | SELF_IMAGE_AXES |
| dinheiro-decisao | moneyPatterns | MONEY_AXES |
| padroes-ocultos | hiddenPatterns | HIDDEN_AXES |

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
- **Manifest.json** configurado com ícones (192x192 e 512x512), tema e categorias
- **Meta tags** Apple Web App para iOS (capable, status-bar-style, title, touch-icon)
- **Open Graph + Twitter Cards** para compartilhamento social
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

## 🔧 Central de Inteligência (`/admin/prompts`)

### Estrutura de 3 Abas
1. **Pipeline** — Prompts + Template + Output Rules + AI Config em uma única view
2. **Perguntas** — CRUD completo de perguntas (edição, geração IA, importação)
3. **Testar** — Simulação de diagnóstico com IA + Histórico de simulações

### Module Health Score (0-100)
Dashboard em tempo real com métricas ponderadas:
- **Cobertura de prompts** (30%): 7 seções preenchidas
- **Profundidade** (20%): densidade de conteúdo (target: >2500 caracteres/seção)
- **Cobertura de eixos** (15%): eixos das perguntas mencionados nos prompts
- **Perguntas** (20%): quantidade e completude de option_scores
- **Configuração** (15%): AI config + template + output rules

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

### Ordem recomendada de uso
1. **Prompts** → Configurar/gerar prompts de IA por tipo
2. **Perguntas** → Gerar perguntas com IA (usa prompts + contexto)
3. **Template** → Preencher template com IA (usa prompts + perguntas)
4. **Output Rules** → Definir regras de formatação
5. **Simulação** → Testar o diagnóstico completo

---

## 🏥 Gestão Profissional

### Funcionalidades
- **Gestão de pacientes** (`/pessoas`): cadastro com CPF, telefone, data nascimento
- **Detalhe do paciente** (`/paciente/:id`): 4 abas (Visão Geral, Histórico, Notas, Lembretes)
- **Convites de leitura**: links únicos com token UUID, validade 7 dias, uso único
- **Dashboard profissional** (`/painel-profissional`): visão agregada
- **Comparação entre pacientes** (`/comparar-pacientes`): análise lado a lado
- **Limites por plano** (`planLimits.ts`): controle de uso mensal

---

## 💳 Pagamentos (Asaas)

- **Planos**: Mensal, Anual, Profissional
- **Métodos**: PIX, Boleto, Cartão de Crédito
- **Webhook**: Atualização automática de status (CONFIRMED, RECEIVED, OVERDUE, etc.)
- **Ciclo de vida**: pending → active → overdue/canceled/expired

---

## 🎮 Gamificação

- **Badges**: conquistas por completar leituras e marcos
- **Celebração**: animação de desbloqueio de badges
- **Ciclo de reteste**: incentivo periódico para reavaliação

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

### Secrets do Backend
- `LOVABLE_API_KEY` — Lovable AI Gateway
- `RESEND_API_KEY` — Envio de emails
- `ASAAS_API_KEY` — Gateway de pagamento
- `ASAAS_WEBHOOK_TOKEN` — Validação de webhooks

### Arquivos auto-gerados (NÃO editar)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/integrations/lovable/index.ts`
- `.env`

---

## 📌 Notas Importantes

1. **Login com Google** funciona apenas no site publicado, não no preview do editor
2. **Roles** são sempre verificados via tabela `user_roles` + função `has_role()`, nunca client-side
3. **Prompts de IA** são editáveis pelo super_admin na Central de Inteligência
4. **Roadmap** com persistência em tempo real via tabela `roadmap_tasks`
5. **Eixos específicos** por módulo — cada análise usa apenas eixos pertinentes ao tema
6. **Labels de eixos** gerenciados via hook `useAxisLabels` com dados do banco + fallback estático
7. **Conflitos comportamentais** detectados automaticamente via `conflictDetection.ts` + `moduleConflictRules.ts`
8. **Relatórios** validados por `reportQualityValidator.ts` antes de exibição
9. **Option scores** mapeados corretamente via índice (0-based)
10. **Geração de perguntas** com deduplicação, inversão e cruzamento de eixos obrigatório
11. **Template de relatório** preenchível automaticamente com IA contextual
12. **Module Health Score** monitora qualidade de cada módulo em tempo real (0-100)
13. **Links públicos** para pacientes via `/t/:token` com validação e uso único
14. **Emails** enviados via Resend com logs em `email_logs`
15. **Lazy loading** em todas as páginas não-críticas para performance
