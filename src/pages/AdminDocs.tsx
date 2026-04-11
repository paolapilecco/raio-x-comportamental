import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Shield, Database, Cpu, CreditCard, Layers, Zap, ChevronDown, ChevronRight, Search, Smartphone, Gamepad2, Brain, Activity, Stethoscope, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

/* ─────── Section Component ─────── */
function DocSection({ id, icon: Icon, title, children, defaultOpen = false }: {
  id: string; icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="border border-border/30 rounded-2xl bg-card/60 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <span className="font-semibold text-sm text-foreground flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-6 pb-6 pt-2 text-sm text-foreground/80 leading-relaxed space-y-4">{children}</div>}
    </div>
  );
}

function InfoTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/20">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40">
            {headers.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-foreground/70">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/10 hover:bg-muted/20">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-foreground/70">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────── Page ─────── */
export default function AdminDocs() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('prd');

  const handleDownload = () => {
    const md = `# Raio-X Comportamental — Documentação Completa
> Gerado em ${new Date().toLocaleDateString('pt-BR')} · v2.0

---

## 1. PRD — Visão Geral do Produto

O **Raio-X Comportamental** é uma plataforma de análise comportamental que identifica padrões invisíveis que dirigem decisões, travas e repetições dos usuários. Através de leituras estruturadas e inteligência artificial, gera diagnósticos profundos e acionáveis.

### Terminologia Obrigatória
- ❌ Nunca usar: "teste", "questionário", "quiz"
- ✅ Sempre usar: "análise", "leitura comportamental", "diagnóstico de padrão"

### Números do Sistema
| Métrica | Valor |
|---------|-------|
| Módulos | 8 |
| Edge Functions | 13 |
| Tabelas | 25+ |
| Páginas | 22 |

### Módulos de Leitura Comportamental
| Slug | Nome | Eixos | Acesso |
|------|------|-------|--------|
| padrao-comportamental | Padrão Comportamental | 8 eixos base | Gratuito |
| execucao-produtividade | Execução & Produtividade | Execução, consistência, evitação | Premium |
| emocoes-reatividade | Emoções & Reatividade | Regulação, ansiedade, reatividade | Premium |
| relacionamentos-apego | Relacionamentos & Apego | Apego, comunicação, limites | Premium |
| autoimagem-identidade | Autoimagem & Identidade | Autocrítica, percepção, valor | Premium |
| dinheiro-decisao | Dinheiro & Decisão | Escassez, abundância, controle | Premium |
| padroes-ocultos | Padrões Ocultos | Mecanismos inconscientes | Premium |
| proposito-sentido | Propósito & Sentido | Pilares de vida | Premium |

### Páginas e Rotas (22)
| Rota | Página | Acesso |
|------|--------|--------|
| / | Landing Page | Público |
| /auth | Login / Cadastro / Google | Público |
| /reset-password | Redefinição de senha | Público |
| /t/:token | Link público para pacientes | Público |
| /onboarding | Config de perfil | Autenticado |
| /tests | Catálogo de leituras | Autenticado |
| /diagnostic/:moduleSlug | Realizar leitura | Autenticado |
| /dashboard | Painel principal | Autenticado |
| /history | Histórico de leituras | Autenticado |
| /central-report | Relatório central unificado | Autenticado |
| /premium | Plano premium | Autenticado |
| /checkout | Pagamento Asaas | Autenticado |
| /profile | Perfil do usuário | Autenticado |
| /pessoas | Gestão de pacientes | Autenticado |
| /paciente/:personId | Detalhe do paciente | Autenticado |
| /painel-profissional | Dashboard profissional | Autenticado |
| /comparar-pacientes | Comparação de pacientes | Autenticado |
| /admin/dashboard | Painel administrativo | Super Admin |
| /admin/prompts | Central de Inteligência | Super Admin |
| /admin/test-modules | Módulos | Super Admin |
| /admin/users | Usuários | Super Admin |
| /admin/subscriptions | Assinaturas | Super Admin |
| /admin/emails | Logs de email | Super Admin |
| /admin/roadmap | Roadmap | Super Admin |
| /admin/docs | Documentação | Super Admin |

### Pagamentos e Planos (Asaas)
| Plano | Métodos | Funcionalidades |
|-------|---------|-----------------|
| Mensal | PIX, Boleto, Cartão | Acesso a todos os módulos premium |
| Anual | PIX, Boleto, Cartão | Premium + desconto anual |
| Profissional | PIX, Boleto, Cartão | Premium + gestão de pacientes + relatórios ilimitados |

Ciclo de vida: pending → active → overdue/canceled/expired. Webhook Asaas atualiza status automaticamente.

### Gestão Profissional
- **Gestão de pacientes** (/pessoas): cadastro com CPF, telefone, data nascimento
- **Detalhe do paciente** (/paciente/:id): 4 abas — Visão Geral, Histórico, Notas, Lembretes
- **Convites de leitura**: links únicos com token UUID, validade 7 dias, uso único
- **Dashboard profissional** (/painel-profissional): visão agregada de todos os pacientes
- **Comparação entre pacientes** (/comparar-pacientes): análise lado a lado
- **Limites por plano**: controle de uso mensal (planLimits.ts)

### Gamificação
- **Badges**: conquistas por completar leituras e marcos
- **Celebração**: animação de desbloqueio de badges (BadgeUnlockCelebration)
- **Ciclo de reteste**: incentivo periódico para reavaliação (RetestCycleCard)

### PWA (App Instalável)
- Manifest.json com ícones 192×192 e 512×512
- Meta tags Apple Web App para iOS
- Open Graph + Twitter Cards para compartilhamento
- Capacitor JS configurado para builds nativos Android/iOS

---

## 2. Manual Técnico

### Stack Tecnológico
| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| Estilização | Tailwind CSS v3 + shadcn/ui |
| Animações | Framer Motion |
| Estado | TanStack React Query |
| Roteamento | React Router v6 |
| Backend | Lovable Cloud (Supabase) |
| PDF | jsPDF |
| Validação | Zod |

### Banco de Dados (25+ tabelas)
| Tabela | Função |
|--------|--------|
| profiles | Dados do usuário (nome, nascimento, CPF, idade) |
| user_roles | Roles: user, premium, admin, super_admin |
| test_modules | Módulos de leitura (slug, nome, ícone, categoria) |
| questions | Perguntas com option_scores, axes, weight, type, context |
| pattern_definitions | Definições de padrões (label, mechanism, triggers) |
| diagnostic_sessions | Sessões de leitura (user_id, module_id, person_id) |
| diagnostic_answers | Respostas do usuário (imutáveis) |
| diagnostic_results | Resultados processados (scores, padrões, diagnóstico) |
| test_prompts | Prompts de IA por módulo (7 tipos) |
| prompt_history | Histórico de alterações em prompts (trigger) |
| report_templates | Templates de relatório (sections + output_rules) |
| global_ai_config | Config global de IA (modelo, temp, tokens, tom) |
| test_ai_config | Config de IA por módulo (override) |
| subscriptions | Assinaturas (plano, status, Asaas IDs) |
| managed_persons | Pacientes gerenciados por profissionais |
| professional_notes | Notas de profissionais sobre pacientes |
| test_invites | Convites de leitura (token único, 7 dias) |
| test_usage | Controle de uso por módulo/mês |
| email_logs | Logs de emails enviados via Resend |
| roadmap_tasks | Tarefas do roadmap (com realtime) |

### Enums do Banco
| Enum | Valores |
|------|---------|
| app_role | admin, user, premium, super_admin |
| prompt_type | interpretation, diagnosis, profile, core_pain, triggers, direction, restrictions |
| question_type | likert, behavior_choice, frequency, intensity |
| subscription_plan | monthly, yearly, profissional |
| subscription_status | pending, active, overdue, canceled, expired |

### Edge Functions (13)
| Função | Descrição | Validação |
|--------|-----------|-----------|
| analyze-test | Processa respostas com IA | Input validation |
| generate-insights | Gera insights baseados nos resultados | Auth check |
| generate-prompt | Gera prompts com IA para o admin | Admin only |
| generate-questions | Gera perguntas inteligentes com IA | Input + deduplicação |
| generate-template | Gera template de relatório com IA | Admin only |
| suggest-question-config | Sugere config ideal de perguntas | Admin only |
| admin-users | Gestão de usuários (listar, roles) | Super admin only |
| asaas-checkout | Criação de checkout no Asaas | Auth + CPF validation |
| asaas-status | Status de pagamento | Auth check |
| asaas-webhook | Webhooks do Asaas | Webhook token validation |
| send-email | Envio de emails via Resend | Auth check |
| submit-public-test | Submissão via link público | Token + single-use |
| validate-invite | Valida token de convite | Token + expiration |

### Funções do Banco (9)
| Função | Tipo | Descrição |
|--------|------|-----------|
| has_role(_user_id, _role) | SECURITY DEFINER | Verifica se usuário tem uma role |
| handle_new_user_role() | Trigger | Atribui role "user" em novos cadastros |
| assign_admin_on_signup() | Trigger | Atribui super_admin para emails autorizados |
| calculate_age() | Trigger | Calcula idade a partir de birth_date |
| update_updated_at_column() | Trigger | Atualiza campo updated_at |
| update_question_count() | Trigger | Sincroniza question_count do módulo |
| log_prompt_change() | Trigger | Registra histórico de alterações em prompts |
| count_managed_persons(_user_id) | SECURITY DEFINER | Conta pacientes ativos do profissional |
| increment_test_usage(...) | SECURITY DEFINER | Incrementa contador de uso com upsert |

### Motor de Pontuação
1. **Com option_scores** (ex: [0, 25, 50, 75, 100]): índice da resposta → valor real do score
2. **Likert sem option_scores**: normalizado 1-5 → 0-4 (subtraindo 1), max=4
3. **Intensity**: valor 0-10 direto (max=10)
4. **Porcentagem final**: (somaScores / somaMaxScores) × 100, capped em 100%
5. **Normalização visual**: padrões ativos (≥15%) recebem piso de 20% no radar

Pipeline: Respostas → option_scores → Soma por eixo → Percentual → Normalização visual → Interpretação neurocientífica → Validação de qualidade → Relatório final

### Central de Inteligência (/admin/prompts)
**Estrutura de 3 Abas:**
1. **Pipeline** — Prompts + Template + Output Rules + AI Config
2. **Perguntas** — CRUD completo (edição, geração IA, importação)
3. **Testar** — Simulação de diagnóstico com IA + Histórico

**Module Health Score (0-100):**
| Métrica | Peso | Target |
|---------|------|--------|
| Cobertura de prompts | 30% | 7 seções preenchidas |
| Profundidade | 20% | >2500 caracteres/seção |
| Cobertura de eixos | 15% | Eixos das perguntas nos prompts |
| Perguntas | 20% | Quantidade + option_scores |
| Configuração | 15% | AI config + template + rules |

**7 Tipos de Prompt:**
| Tipo | Função |
|------|--------|
| interpretation | Como interpretar os scores dos eixos |
| diagnosis | Como gerar o diagnóstico comportamental |
| profile | Como nomear o perfil do usuário |
| core_pain | Como identificar a dor central |
| triggers | Como identificar gatilhos e armadilhas |
| direction | Como gerar direcionamentos de saída |
| restrictions | O que NÃO fazer / orientações negativas |

### Geração Inteligente de Perguntas (IA)
- **Análise contextual**: carrega prompts, template e padrões antes de gerar
- **Deduplicação**: compara com perguntas existentes do mesmo e outros testes
- **Perguntas invertidas**: 20-30% reverse-scored para validação cruzada
- **Cruzamento de eixos**: ≥40% tocam 2+ eixos
- **Cobertura total**: valida que todos os eixos são cobertos
- **Alinhamento com relatório**: perguntas para alimentar seções do template
- **Validação option_scores**: cada pergunta inclui valores de score por opção

---

## 3. Segurança

### Autenticação
**Métodos:**
- **Email + Senha** — validação Zod (email max 255, senha min 6)
- **Google OAuth** — via Lovable Cloud
- **Recuperação de senha** — link por email com redirecionamento

**Sistema de Roles:**
| Role | Permissões |
|------|-----------|
| user | Acesso básico, leituras gratuitas |
| premium | Conteúdo premium + tudo de user |
| admin | Gestão parcial |
| super_admin | Gerenciamento total |

**Super Admins autorizados:** paolabem@gmail.com · trafegocomkrisan@gmail.com
Trigger de banco garante atribuição automática no signup.

### Row Level Security (RLS)
- ✅ RLS habilitado em todas as tabelas
- ✅ Roles via tabela dedicada user_roles (nunca no perfil)
- ✅ Função has_role() — SECURITY DEFINER com search_path fixo
- ✅ Triggers automáticos: role "user" no signup + admin para emails autorizados
- ✅ Respostas imutáveis: diagnostic_answers não permite UPDATE
- ✅ Mensagens de erro genéricas — erros internos nunca expostos ao cliente
- ✅ HIBP Check — proteção contra senhas vazadas
- ✅ 0 vulnerabilidades ativas — auditorias constantes confirmam

### Segurança de Edge Functions
- Todos os endpoints validam JWT ou token conforme o contexto
- Endpoints admin exigem role super_admin via has_role()
- Endpoints públicos protegidos por tokens UUID únicos + expiração + uso único
- Inputs validados server-side
- Erros genéricos retornados ao cliente

### Auditoria e Compliance
- **plan_change_history**: toda mudança de plano é registrada
- **prompt_history**: toda alteração em prompts é versionada (trigger automático)
- **email_logs**: logs de todos os emails enviados
- **CPF protegido**: apenas o próprio usuário pode ler seu CPF via RLS
- **Tokens de convite**: expiram em 7 dias, uso único, UUID aleatório

---

*Raio-X Comportamental · v2.0*
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`RaioX_Documentacao_Completa_\${new Date().toISOString().slice(0,10)}.md\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
  }, [authLoading, isSuperAdmin]);

  if (authLoading) {
    return <AppLayout><div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Header */}
        <motion.div {...fadeUp} className="space-y-2">
          <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-2 text-muted-foreground/60 hover:text-foreground/80 text-[0.8rem] transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Admin
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Documentação do Sistema</h1>
              <p className="text-[0.78rem] text-muted-foreground/60">PRD completo · Manual Técnico · Arquitetura</p>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div {...fadeUp} transition={{ delay: 0.02 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input
              placeholder="Buscar na documentação..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border/30 rounded-xl h-10 text-sm"
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div {...fadeUp} transition={{ delay: 0.04 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/30 p-1 rounded-xl gap-1">
              <TabsTrigger value="prd" className="text-[0.8rem] font-semibold rounded-lg data-[state=active]:shadow-sm">
                <FileText className="w-4 h-4 mr-1.5" /> PRD
              </TabsTrigger>
              <TabsTrigger value="tecnico" className="text-[0.8rem] font-semibold rounded-lg data-[state=active]:shadow-sm">
                <Cpu className="w-4 h-4 mr-1.5" /> Técnico
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="text-[0.8rem] font-semibold rounded-lg data-[state=active]:shadow-sm">
                <Shield className="w-4 h-4 mr-1.5" /> Segurança
              </TabsTrigger>
            </TabsList>

            {/* ═══ PRD ═══ */}
            <TabsContent value="prd" className="mt-5 space-y-4">
              <DocSection id="visao" icon={BookOpen} title="Visão Geral do Produto" defaultOpen>
                <p>O <strong>Raio-X Comportamental</strong> é uma plataforma de análise comportamental que identifica padrões invisíveis que dirigem decisões, travas e repetições dos usuários. Através de leituras estruturadas e inteligência artificial, gera diagnósticos profundos e acionáveis.</p>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs">
                  <p className="font-semibold text-amber-700 mb-1">⚠️ Terminologia Obrigatória</p>
                  <p>❌ Nunca usar: "teste", "questionário", "quiz"</p>
                  <p>✅ Sempre usar: "análise", "leitura comportamental", "diagnóstico de padrão"</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {[
                    { label: 'Módulos', value: '8', icon: Brain },
                    { label: 'Edge Functions', value: '13', icon: Zap },
                    { label: 'Tabelas', value: '25+', icon: Database },
                    { label: 'Páginas', value: '22', icon: Layers },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/30 rounded-xl p-3 flex items-center gap-2">
                      <s.icon className="w-4 h-4 text-primary/60" />
                      <div>
                        <p className="text-lg font-bold text-foreground">{s.value}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DocSection>

              <DocSection id="modulos" icon={Brain} title="Módulos de Leitura Comportamental">
                <InfoTable
                  headers={['Slug', 'Nome', 'Eixos', 'Acesso']}
                  rows={[
                    ['padrao-comportamental', 'Padrão Comportamental', '8 eixos base', 'Gratuito'],
                    ['execucao-produtividade', 'Execução & Produtividade', 'Execução, consistência, evitação', 'Premium'],
                    ['emocoes-reatividade', 'Emoções & Reatividade', 'Regulação, ansiedade, reatividade', 'Premium'],
                    ['relacionamentos-apego', 'Relacionamentos & Apego', 'Apego, comunicação, limites', 'Premium'],
                    ['autoimagem-identidade', 'Autoimagem & Identidade', 'Autocrítica, percepção, valor', 'Premium'],
                    ['dinheiro-decisao', 'Dinheiro & Decisão', 'Escassez, abundância, controle', 'Premium'],
                    ['padroes-ocultos', 'Padrões Ocultos', 'Mecanismos inconscientes', 'Premium'],
                    ['proposito-sentido', 'Propósito & Sentido', 'Pilares de vida', 'Premium'],
                  ]}
                />
              </DocSection>

              <DocSection id="rotas" icon={Layers} title="Páginas e Rotas (22)">
                <InfoTable
                  headers={['Rota', 'Página', 'Acesso']}
                  rows={[
                    ['/', 'Landing Page', 'Público'],
                    ['/auth', 'Login / Cadastro / Google', 'Público'],
                    ['/reset-password', 'Redefinição de senha', 'Público'],
                    ['/t/:token', 'Link público para pacientes', 'Público'],
                    ['/onboarding', 'Config de perfil', 'Autenticado'],
                    ['/tests', 'Catálogo de leituras', 'Autenticado'],
                    ['/diagnostic/:moduleSlug', 'Realizar leitura', 'Autenticado'],
                    ['/dashboard', 'Painel principal', 'Autenticado'],
                    ['/history', 'Histórico de leituras', 'Autenticado'],
                    ['/central-report', 'Relatório central unificado', 'Autenticado'],
                    ['/premium', 'Plano premium', 'Autenticado'],
                    ['/checkout', 'Pagamento Asaas', 'Autenticado'],
                    ['/profile', 'Perfil do usuário', 'Autenticado'],
                    ['/pessoas', 'Gestão de pacientes', 'Autenticado'],
                    ['/paciente/:personId', 'Detalhe do paciente', 'Autenticado'],
                    ['/painel-profissional', 'Dashboard profissional', 'Autenticado'],
                    ['/comparar-pacientes', 'Comparação de pacientes', 'Autenticado'],
                    ['/admin/dashboard', 'Painel administrativo', 'Super Admin'],
                    ['/admin/prompts', 'Central de Inteligência', 'Super Admin'],
                    ['/admin/test-modules', 'Módulos', 'Super Admin'],
                    ['/admin/users', 'Usuários', 'Super Admin'],
                    ['/admin/subscriptions', 'Assinaturas', 'Super Admin'],
                    ['/admin/emails', 'Logs de email', 'Super Admin'],
                    ['/admin/roadmap', 'Roadmap', 'Super Admin'],
                    ['/admin/docs', 'Documentação', 'Super Admin'],
                  ]}
                />
              </DocSection>

              <DocSection id="planos" icon={CreditCard} title="Pagamentos e Planos (Asaas)">
                <InfoTable
                  headers={['Plano', 'Métodos', 'Funcionalidades']}
                  rows={[
                    ['Mensal', 'PIX, Boleto, Cartão', 'Acesso a todos os módulos premium'],
                    ['Anual', 'PIX, Boleto, Cartão', 'Premium + desconto anual'],
                    ['Profissional', 'PIX, Boleto, Cartão', 'Premium + gestão de pacientes + relatórios ilimitados'],
                  ]}
                />
                <p className="text-xs text-muted-foreground mt-2">Ciclo de vida: pending → active → overdue/canceled/expired. Webhook Asaas atualiza status automaticamente.</p>
              </DocSection>

              <DocSection id="gestao-pro" icon={Stethoscope} title="Gestão Profissional">
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Gestão de pacientes</strong> (/pessoas): cadastro com CPF, telefone, data nascimento</li>
                  <li>• <strong>Detalhe do paciente</strong> (/paciente/:id): 4 abas — Visão Geral, Histórico, Notas, Lembretes</li>
                  <li>• <strong>Convites de leitura</strong>: links únicos com token UUID, validade 7 dias, uso único</li>
                  <li>• <strong>Dashboard profissional</strong> (/painel-profissional): visão agregada de todos os pacientes</li>
                  <li>• <strong>Comparação entre pacientes</strong> (/comparar-pacientes): análise lado a lado</li>
                  <li>• <strong>Limites por plano</strong>: controle de uso mensal (planLimits.ts)</li>
                </ul>
              </DocSection>

              <DocSection id="gamificacao" icon={Gamepad2} title="Gamificação">
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Badges</strong>: conquistas por completar leituras e marcos</li>
                  <li>• <strong>Celebração</strong>: animação de desbloqueio de badges (BadgeUnlockCelebration)</li>
                  <li>• <strong>Ciclo de reteste</strong>: incentivo periódico para reavaliação (RetestCycleCard)</li>
                </ul>
              </DocSection>

              <DocSection id="pwa" icon={Smartphone} title="PWA (App Instalável)">
                <ul className="space-y-1 text-xs">
                  <li>• Manifest.json com ícones 192×192 e 512×512</li>
                  <li>• Meta tags Apple Web App para iOS (capable, status-bar-style)</li>
                  <li>• Open Graph + Twitter Cards para compartilhamento</li>
                  <li>• Instalação: Compartilhar → Adicionar à Tela Início (iOS) ou menu do navegador (Android)</li>
                  <li>• Sem service worker (evita conflitos com preview)</li>
                </ul>
              </DocSection>
            </TabsContent>

            {/* ═══ TÉCNICO ═══ */}
            <TabsContent value="tecnico" className="mt-5 space-y-4">
              <DocSection id="stack" icon={Cpu} title="Stack Tecnológico" defaultOpen>
                <InfoTable
                  headers={['Camada', 'Tecnologia']}
                  rows={[
                    ['Frontend', 'React 18 + TypeScript 5 + Vite 5'],
                    ['Estilização', 'Tailwind CSS v3 + shadcn/ui'],
                    ['Animações', 'Framer Motion'],
                    ['Estado', 'TanStack React Query'],
                    ['Roteamento', 'React Router v6'],
                    ['Backend', 'Lovable Cloud (Supabase)'],
                    ['PDF', 'jsPDF'],
                    ['Validação', 'Zod'],
                  ]}
                />
              </DocSection>

              <DocSection id="banco" icon={Database} title="Banco de Dados (25+ tabelas)">
                <InfoTable
                  headers={['Tabela', 'Função']}
                  rows={[
                    ['profiles', 'Dados do usuário (nome, nascimento, CPF, idade)'],
                    ['user_roles', 'Roles: user, premium, admin, super_admin'],
                    ['test_modules', 'Módulos de leitura (slug, nome, ícone, categoria)'],
                    ['questions', 'Perguntas com option_scores, axes, weight, type, context'],
                    ['pattern_definitions', 'Definições de padrões (label, mechanism, triggers)'],
                    ['diagnostic_sessions', 'Sessões de leitura (user_id, module_id, person_id)'],
                    ['diagnostic_answers', 'Respostas do usuário (imutáveis)'],
                    ['diagnostic_results', 'Resultados processados (scores, padrões, diagnóstico)'],
                    ['test_prompts', 'Prompts de IA por módulo (7 tipos)'],
                    ['prompt_history', 'Histórico de alterações em prompts (trigger)'],
                    ['report_templates', 'Templates de relatório (sections + output_rules)'],
                    ['global_ai_config', 'Config global de IA (modelo, temp, tokens, tom)'],
                    ['test_ai_config', 'Config de IA por módulo (override)'],
                    ['subscriptions', 'Assinaturas (plano, status, Asaas IDs)'],
                    ['managed_persons', 'Pacientes gerenciados por profissionais'],
                    ['professional_notes', 'Notas de profissionais sobre pacientes'],
                    ['test_invites', 'Convites de leitura (token único, 7 dias)'],
                    ['test_usage', 'Controle de uso por módulo/mês'],
                    ['email_logs', 'Logs de emails enviados via Resend'],
                    ['roadmap_tasks', 'Tarefas do roadmap (com realtime)'],
                  ]}
                />
              </DocSection>

              <DocSection id="enums" icon={Layers} title="Enums do Banco">
                <InfoTable
                  headers={['Enum', 'Valores']}
                  rows={[
                    ['app_role', 'admin, user, premium, super_admin'],
                    ['prompt_type', 'interpretation, diagnosis, profile, core_pain, triggers, direction, restrictions'],
                    ['question_type', 'likert, behavior_choice, frequency, intensity'],
                    ['subscription_plan', 'monthly, yearly, profissional'],
                    ['subscription_status', 'pending, active, overdue, canceled, expired'],
                  ]}
                />
              </DocSection>

              <DocSection id="functions" icon={Zap} title="Edge Functions (13)">
                <InfoTable
                  headers={['Função', 'Descrição', 'Validação']}
                  rows={[
                    ['analyze-test', 'Processa respostas com IA', 'Input validation (testName, scores)'],
                    ['generate-insights', 'Gera insights baseados nos resultados', 'Auth check'],
                    ['generate-prompt', 'Gera prompts com IA para o admin', 'Admin only'],
                    ['generate-questions', 'Gera perguntas inteligentes com IA', 'Input + deduplicação'],
                    ['generate-template', 'Gera template de relatório com IA', 'Admin only'],
                    ['suggest-question-config', 'Sugere config ideal de perguntas', 'Admin only'],
                    ['admin-users', 'Gestão de usuários (listar, roles)', 'Super admin only'],
                    ['asaas-checkout', 'Criação de checkout no Asaas', 'Auth + CPF validation'],
                    ['asaas-status', 'Status de pagamento', 'Auth check'],
                    ['asaas-webhook', 'Webhooks do Asaas', 'Webhook token validation'],
                    ['send-email', 'Envio de emails via Resend', 'Auth check'],
                    ['submit-public-test', 'Submissão via link público', 'Token + single-use'],
                    ['validate-invite', 'Valida token de convite', 'Token + expiration'],
                  ]}
                />
              </DocSection>

              <DocSection id="db-functions" icon={Database} title="Funções do Banco (9)">
                <InfoTable
                  headers={['Função', 'Tipo', 'Descrição']}
                  rows={[
                    ['has_role(_user_id, _role)', 'SECURITY DEFINER', 'Verifica se usuário tem uma role'],
                    ['handle_new_user_role()', 'Trigger', 'Atribui role "user" em novos cadastros'],
                    ['assign_admin_on_signup()', 'Trigger', 'Atribui super_admin para emails autorizados'],
                    ['calculate_age()', 'Trigger', 'Calcula idade a partir de birth_date'],
                    ['update_updated_at_column()', 'Trigger', 'Atualiza campo updated_at'],
                    ['update_question_count()', 'Trigger', 'Sincroniza question_count do módulo'],
                    ['log_prompt_change()', 'Trigger', 'Registra histórico de alterações em prompts'],
                    ['count_managed_persons(_user_id)', 'SECURITY DEFINER', 'Conta pacientes ativos do profissional'],
                    ['increment_test_usage(...)', 'SECURITY DEFINER', 'Incrementa contador de uso com upsert'],
                  ]}
                />
              </DocSection>

              <DocSection id="motor" icon={Activity} title="Motor de Pontuação">
                <div className="space-y-3">
                  <p className="font-medium text-foreground">Cálculo de Porcentagem por Eixo:</p>
                  <ol className="space-y-1 text-xs list-decimal list-inside">
                    <li><strong>Com option_scores</strong> (ex: [0, 25, 50, 75, 100]): índice da resposta → valor real do score</li>
                    <li><strong>Likert sem option_scores</strong>: normalizado 1-5 → 0-4 (subtraindo 1), max=4</li>
                    <li><strong>Intensity</strong>: valor 0-10 direto (max=10)</li>
                    <li><strong>Porcentagem final</strong>: (somaScores / somaMaxScores) × 100, capped em 100%</li>
                    <li><strong>Normalização visual</strong>: padrões ativos (≥15%) recebem piso de 20% no radar</li>
                  </ol>
                  <div className="bg-muted/30 rounded-xl p-3 text-xs font-mono">
                    Respostas → option_scores → Soma por eixo → Percentual → Normalização visual → Interpretação neurocientífica → Validação de qualidade → Relatório final
                  </div>
                </div>
              </DocSection>

              <DocSection id="central-inteligencia" icon={Brain} title="Central de Inteligência (/admin/prompts)">
                <div className="space-y-3">
                  <p className="font-medium text-foreground">Estrutura de 3 Abas:</p>
                  <ol className="text-xs space-y-1 list-decimal list-inside">
                    <li><strong>Pipeline</strong> — Prompts + Template + Output Rules + AI Config</li>
                    <li><strong>Perguntas</strong> — CRUD completo (edição, geração IA, importação)</li>
                    <li><strong>Testar</strong> — Simulação de diagnóstico com IA + Histórico</li>
                  </ol>

                  <p className="font-medium text-foreground mt-3">Module Health Score (0-100):</p>
                  <InfoTable
                    headers={['Métrica', 'Peso', 'Target']}
                    rows={[
                      ['Cobertura de prompts', '30%', '7 seções preenchidas'],
                      ['Profundidade', '20%', '>2500 caracteres/seção'],
                      ['Cobertura de eixos', '15%', 'Eixos das perguntas nos prompts'],
                      ['Perguntas', '20%', 'Quantidade + option_scores'],
                      ['Configuração', '15%', 'AI config + template + rules'],
                    ]}
                  />

                  <p className="font-medium text-foreground mt-3">7 Tipos de Prompt:</p>
                  <InfoTable
                    headers={['Tipo', 'Função']}
                    rows={[
                      ['interpretation', 'Como interpretar os scores dos eixos'],
                      ['diagnosis', 'Como gerar o diagnóstico comportamental'],
                      ['profile', 'Como nomear o perfil do usuário'],
                      ['core_pain', 'Como identificar a dor central'],
                      ['triggers', 'Como identificar gatilhos e armadilhas'],
                      ['direction', 'Como gerar direcionamentos de saída'],
                      ['restrictions', 'O que NÃO fazer / orientações negativas'],
                    ]}
                  />
                </div>
              </DocSection>

              <DocSection id="geração-perguntas" icon={FileText} title="Geração Inteligente de Perguntas (IA)">
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Análise contextual</strong>: carrega prompts, template e padrões antes de gerar</li>
                  <li>• <strong>Deduplicação</strong>: compara com perguntas existentes do mesmo e outros testes</li>
                  <li>• <strong>Perguntas invertidas</strong>: 20-30% reverse-scored para validação cruzada</li>
                  <li>• <strong>Cruzamento de eixos</strong>: ≥40% tocam 2+ eixos</li>
                  <li>• <strong>Cobertura total</strong>: valida que todos os eixos são cobertos</li>
                  <li>• <strong>Alinhamento com relatório</strong>: perguntas para alimentar seções do template</li>
                  <li>• <strong>Validação option_scores</strong>: cada pergunta inclui valores de score por opção</li>
                </ul>
              </DocSection>
            </TabsContent>

            {/* ═══ SEGURANÇA ═══ */}
            <TabsContent value="seguranca" className="mt-5 space-y-4">
              <DocSection id="auth" icon={Shield} title="Autenticação" defaultOpen>
                <div className="space-y-3">
                  <p className="font-medium text-foreground">Métodos:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Email + Senha</strong> — validação Zod (email max 255, senha min 6)</li>
                    <li>• <strong>Google OAuth</strong> — via Lovable Cloud (funciona no site publicado)</li>
                    <li>• <strong>Recuperação de senha</strong> — link por email com redirecionamento</li>
                  </ul>

                  <p className="font-medium text-foreground mt-3">Sistema de Roles:</p>
                  <InfoTable
                    headers={['Role', 'Permissões']}
                    rows={[
                      ['user', 'Acesso básico, leituras gratuitas'],
                      ['premium', 'Conteúdo premium + tudo de user'],
                      ['admin', 'Gestão parcial'],
                      ['super_admin', 'Gerenciamento total (prompts, módulos, usuários, IA)'],
                    ]}
                  />

                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs mt-2">
                    <p className="font-semibold text-amber-700">Super Admins autorizados:</p>
                    <p>paolabem@gmail.com · trafegocomkrisan@gmail.com</p>
                    <p className="text-muted-foreground mt-1">Trigger de banco garante atribuição automática no signup.</p>
                  </div>
                </div>
              </DocSection>

              <DocSection id="rls" icon={Database} title="Row Level Security (RLS)">
                <ul className="space-y-1 text-xs">
                  <li>✅ <strong>RLS habilitado</strong> em todas as tabelas</li>
                  <li>✅ <strong>Roles via tabela dedicada</strong> user_roles (nunca no perfil)</li>
                  <li>✅ <strong>Função has_role()</strong> — SECURITY DEFINER com search_path fixo</li>
                  <li>✅ <strong>Triggers automáticos</strong>: role "user" no signup + admin para emails autorizados</li>
                  <li>✅ <strong>Respostas imutáveis</strong>: diagnostic_answers não permite UPDATE</li>
                  <li>✅ <strong>Mensagens de erro genéricas</strong> — erros internos nunca expostos ao cliente</li>
                  <li>✅ <strong>HIBP Check</strong> — proteção contra senhas vazadas</li>
                  <li>✅ <strong>0 vulnerabilidades ativas</strong> — auditorias constantes confirmam</li>
                </ul>
              </DocSection>

              <DocSection id="edge-security" icon={Zap} title="Segurança de Edge Functions">
                <ul className="space-y-1 text-xs">
                  <li>• Todos os endpoints validam JWT ou token conforme o contexto</li>
                  <li>• Endpoints admin exigem role super_admin via has_role()</li>
                  <li>• Endpoints públicos (submit-public-test, validate-invite) são protegidos por tokens UUID únicos + expiração + uso único</li>
                  <li>• Inputs validados server-side (testName, scores, CPF, etc.)</li>
                  <li>• Erros genéricos retornados ao cliente — detalhes apenas em server logs</li>
                </ul>
              </DocSection>

              <DocSection id="audit" icon={Shield} title="Auditoria e Compliance">
                <ul className="space-y-1 text-xs">
                  <li>• <strong>plan_change_history</strong>: toda mudança de plano é registrada</li>
                  <li>• <strong>prompt_history</strong>: toda alteração em prompts é versionada (trigger automático)</li>
                  <li>• <strong>email_logs</strong>: logs de todos os emails enviados (destinatário, template, status, erro)</li>
                  <li>• <strong>CPF protegido</strong>: apenas o próprio usuário pode ler seu CPF via RLS</li>
                  <li>• <strong>Tokens de convite</strong>: expiram em 7 dias, uso único, UUID aleatório</li>
                </ul>
              </DocSection>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Footer */}
        <div className="text-center text-[0.7rem] text-muted-foreground/40 pt-6 pb-2">
          Raio-X Comportamental · Última atualização: {new Date().toLocaleDateString('pt-BR')} · v2.0
        </div>
      </div>
    </AppLayout>
  );
}
