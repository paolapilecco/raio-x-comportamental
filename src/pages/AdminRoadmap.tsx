import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon, Info,
  Copy, Check, Sparkles, Clock, Shield, Bug, Layers, Zap,
  ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

type Priority = 'critical' | 'high' | 'medium' | 'low';
type Status = 'pending' | 'in_progress' | 'done';
type Category = 'security' | 'bug' | 'inconsistency' | 'improvement' | 'feature';

interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  status: Status;
  copyText: string;
}

const priorityConfig: Record<Priority, { label: string; icon: any; color: string; bgColor: string; borderColor: string; order: number }> = {
  critical: { label: 'Crítico', icon: AlertOctagon, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', order: 0 },
  high: { label: 'Alto', icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', order: 1 },
  medium: { label: 'Médio', icon: Info, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', order: 2 },
  low: { label: 'Baixo', icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/20', order: 3 },
};

const categoryConfig: Record<Category, { label: string; icon: any; color: string }> = {
  security: { label: 'Segurança', icon: Shield, color: 'text-red-400' },
  bug: { label: 'Bug', icon: Bug, color: 'text-orange-400' },
  inconsistency: { label: 'Inconsistência', icon: Zap, color: 'text-yellow-400' },
  improvement: { label: 'Melhoria', icon: Sparkles, color: 'text-purple-400' },
  feature: { label: 'Feature', icon: Layers, color: 'text-blue-400' },
};

const statusConfig: Record<Status, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-muted-foreground/60' },
  in_progress: { label: 'Em progresso', icon: RefreshCw, color: 'text-amber-500' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'text-emerald-500' },
};

function generateTasks(): RoadmapTask[] {
  return [
    // ── CRITICAL ──
    {
      id: 'sec-roles-escalation',
      title: '🔴 Corrigir escalação de privilégio na tabela user_roles',
      description: 'A política ALL na tabela user_roles permitia que qualquer usuário autenticado inserisse roles, podendo se tornar super_admin. CORRIGIDO — políticas separadas por operação agora aplicadas.',
      priority: 'critical',
      category: 'security',
      status: 'done',
      copyText: 'Corrigir vulnerabilidade de escalação de privilégio na tabela user_roles. A política ALL permite que qualquer usuário autenticado insira roles e se torne super_admin. Substituir por políticas separadas (SELECT, INSERT, UPDATE, DELETE) restritas a super_admins.',
    },

    // ── HIGH ──
    {
      id: 'bug-admin-loading',
      title: 'Admin Prompts não carrega para super admin',
      description: 'A página /admin/prompts pode não carregar corretamente devido a condição de corrida entre auth loading e fetchData. O isSuperAdmin pode ser false momentaneamente durante o carregamento.',
      priority: 'high',
      category: 'bug',
      status: 'pending',
      copyText: 'Corrigir bug na página AdminPrompts (/admin/prompts) que não carrega para super admin. O problema é uma condição de corrida: o useEffect depende de authLoading e isSuperAdmin, mas o fetchProfile pode não ter completado quando o useEffect executa. Garantir que o loading state é exibido até que a role esteja confirmada.',
    },
    {
      id: 'bug-prompt-history-insert',
      title: 'Trigger prompt_history não consegue inserir (RLS bloqueando)',
      description: 'A tabela prompt_history não tem política INSERT. O trigger log_prompt_change usa SECURITY DEFINER mas a tabela pode bloquear inserções via RLS. Verificar se o trigger bypassa RLS corretamente.',
      priority: 'high',
      category: 'bug',
      status: 'pending',
      copyText: 'Verificar e corrigir a inserção na tabela prompt_history. O trigger log_prompt_change é SECURITY DEFINER e deveria bypassar RLS, mas a tabela não tem política INSERT. Confirmar que o trigger funciona corretamente ou adicionar política INSERT para o trigger/service role.',
    },
    {
      id: 'bug-db-triggers-missing',
      title: 'Triggers do banco não estão registrados',
      description: 'A seção db-triggers mostra "There are no triggers in the database" mas existem funções de trigger definidas (log_prompt_change, handle_new_user_role, assign_admin_on_signup, calculate_age, update_updated_at_column). Os triggers precisam ser criados/recriados.',
      priority: 'high',
      category: 'bug',
      status: 'pending',
      copyText: 'Os triggers do banco de dados não estão registrados apesar das funções existirem. Criar os triggers: (1) log_prompt_change em test_prompts BEFORE UPDATE, (2) handle_new_user_role em auth.users AFTER INSERT, (3) assign_admin_on_signup em auth.users AFTER INSERT, (4) calculate_age em profiles BEFORE INSERT OR UPDATE, (5) update_updated_at_column nas tabelas que precisam.',
    },
    {
      id: 'inc-test-modules-no-crud',
      title: 'Super admin não consegue gerenciar test_modules via app',
      description: 'A tabela test_modules só tem política SELECT. O super admin não pode criar, editar ou deletar módulos de teste pela interface. Falta políticas de INSERT/UPDATE/DELETE para super_admins e UI para gerenciamento.',
      priority: 'high',
      category: 'inconsistency',
      status: 'pending',
      copyText: 'Adicionar políticas RLS de INSERT, UPDATE e DELETE na tabela test_modules para super_admins. Também criar interface no admin para gerenciar módulos de teste (criar, editar, ativar/desativar, reordenar). Atualmente só existe política SELECT.',
    },
    {
      id: 'inc-questions-no-crud',
      title: 'Super admin não consegue gerenciar perguntas via app',
      description: 'A tabela questions só tem política SELECT. O super admin precisa de interface e permissões para criar/editar/deletar perguntas dos testes.',
      priority: 'high',
      category: 'inconsistency',
      status: 'pending',
      copyText: 'Adicionar políticas RLS de INSERT, UPDATE e DELETE na tabela questions para super_admins. Criar interface no admin para gerenciar perguntas de cada teste (adicionar, editar texto/eixos/tipo, reordenar, deletar). Atualmente só existe política SELECT para autenticados.',
    },

    // ── MEDIUM ──
    {
      id: 'inc-css-import-order',
      title: 'Ordem de @import no index.css pode causar problemas',
      description: 'Warnings de build indicam que @import rules devem vir antes de outros conteúdos no CSS. Isso pode causar falhas de renderização de fontes.',
      priority: 'medium',
      category: 'bug',
      status: 'pending',
      copyText: 'Corrigir a ordem dos @import no arquivo src/index.css. Os @import de fontes do Google devem ficar ANTES de qualquer @tailwind directive ou outro conteúdo CSS. Mover todos os @import para o topo absoluto do arquivo.',
    },
    {
      id: 'inc-hardcoded-patterns',
      title: 'patternDefinitions ainda hardcoded no frontend',
      description: 'O arquivo src/data/patterns.ts contém definições estáticas de padrões. O relatório central e histórico dependem desses dados hardcoded ao invés dos prompts configurados no admin.',
      priority: 'medium',
      category: 'inconsistency',
      status: 'pending',
      copyText: 'Migrar as patternDefinitions hardcoded em src/data/patterns.ts para o banco de dados. O CentralReport, DiagnosticHistory, Dashboard e Profile ainda usam esses dados estáticos ao invés dos prompts configurados pelo admin. Criar uma tabela pattern_definitions ou usar os test_prompts existentes.',
    },
    {
      id: 'inc-radar-labels-hardcoded',
      title: 'Labels do radar chart hardcoded em múltiplos arquivos',
      description: 'radarAxisLabels está duplicado em Dashboard.tsx, DiagnosticHistory.tsx e CentralReport.tsx. Deveria ser centralizado e dinâmico baseado nos eixos do teste.',
      priority: 'medium',
      category: 'inconsistency',
      status: 'pending',
      copyText: 'Centralizar o objeto radarAxisLabels que está duplicado em Dashboard.tsx, DiagnosticHistory.tsx e CentralReport.tsx. Criar um arquivo compartilhado (ex: src/data/axisLabels.ts) ou carregar os labels dinamicamente do banco baseado nos eixos configurados.',
    },
    {
      id: 'inc-conflict-pairs-hardcoded',
      title: 'Pares de conflito hardcoded em CentralReport e centralProfile',
      description: 'Os conflictPairs estão duplicados em CentralReport.tsx e centralProfile.ts com lógica similar. Deveria ser centralizado.',
      priority: 'medium',
      category: 'inconsistency',
      status: 'pending',
      copyText: 'Centralizar a lógica de detecção de conflitos comportamentais que está duplicada em src/pages/CentralReport.tsx e src/lib/centralProfile.ts. Criar um módulo compartilhado com os pares de conflito e a função de detecção.',
    },
    {
      id: 'feat-premium-payment',
      title: 'Botão Premium não tem integração de pagamento',
      description: 'A página Premium.tsx mostra um botão "Upgrade Premium" mas não tem integração com Stripe ou qualquer processador de pagamento. O upgrade só funciona via atribuição manual de role.',
      priority: 'medium',
      category: 'feature',
      status: 'pending',
      copyText: 'Implementar integração de pagamento na página Premium. Atualmente o botão "Upgrade Premium" não faz nada. Integrar com Stripe para processar pagamentos e automaticamente atribuir a role premium ao usuário após confirmação.',
    },
    {
      id: 'inc-onboarding-redirect',
      title: 'Onboarding redireciona para /diagnostic genérico',
      description: 'Após completar o onboarding, o usuário é redirecionado para /diagnostic sem moduleSlug, o que usa o slug padrão "padrao-comportamental". Deveria redirecionar para /tests ou /dashboard.',
      priority: 'medium',
      category: 'inconsistency',
      status: 'pending',
      copyText: 'Alterar o redirecionamento pós-onboarding de /diagnostic para /dashboard ou /tests. Atualmente redireciona para /diagnostic sem slug, forçando o teste padrão. O usuário deveria poder escolher qual teste iniciar.',
    },
    {
      id: 'inc-question-count-mismatch',
      title: 'question_count no test_modules pode estar desatualizado',
      description: 'O campo question_count nos test_modules é estático e pode não refletir o número real de perguntas na tabela questions. TestCatalog já faz a contagem real mas o Dashboard usa o valor estático.',
      priority: 'medium',
      category: 'inconsistency',
      status: 'pending',
      copyText: 'Criar um trigger ou função que atualiza automaticamente o campo question_count na tabela test_modules sempre que uma pergunta é adicionada ou removida da tabela questions. Alternativamente, sempre buscar a contagem real como o TestCatalog já faz.',
    },

    // ── LOW ──
    {
      id: 'imp-error-handling',
      title: 'Melhorar tratamento de erros nas queries do Supabase',
      description: 'Várias queries ignoram erros silenciosamente (ex: Dashboard fetchData, Profile fetchData). Deveria exibir feedback ao usuário quando dados falham ao carregar.',
      priority: 'low',
      category: 'improvement',
      status: 'pending',
      copyText: 'Melhorar tratamento de erros em todas as queries do Supabase no frontend. Atualmente várias queries ignoram erros silenciosamente (Dashboard, Profile, CentralReport, DiagnosticHistory). Adicionar toast.error ou estado de erro visual quando queries falham.',
    },
    {
      id: 'imp-loading-skeletons',
      title: 'Adicionar loading skeletons ao invés de spinners genéricos',
      description: 'Todas as páginas usam o mesmo spinner circular durante carregamento. Skeletons proporcionam melhor UX mostrando a estrutura do conteúdo.',
      priority: 'low',
      category: 'improvement',
      status: 'pending',
      copyText: 'Substituir os spinners de carregamento genéricos por loading skeletons em todas as páginas principais (Dashboard, TestCatalog, Profile, CentralReport, DiagnosticHistory). Usar o componente Skeleton já existente do shadcn para mostrar a estrutura do conteúdo durante carregamento.',
    },
    {
      id: 'imp-mobile-responsive',
      title: 'Revisar responsividade mobile em todas as páginas',
      description: 'Algumas páginas podem ter problemas de layout em telas pequenas, especialmente o AdminPrompts com muitos campos de edição.',
      priority: 'low',
      category: 'improvement',
      status: 'pending',
      copyText: 'Revisar e melhorar a responsividade mobile em todas as páginas, especialmente AdminPrompts, CentralReport e Dashboard. Garantir que todos os formulários, tabelas e gráficos funcionem bem em telas pequenas (320px-480px).',
    },
    {
      id: 'imp-pdf-ai-content',
      title: 'PDF usa dados estáticos ao invés do conteúdo gerado pela IA',
      description: 'O generatePdf.ts usa as patternDefinitions hardcoded. Quando a análise é feita pela IA, o PDF deveria usar o conteúdo gerado pela IA ao invés dos dados estáticos.',
      priority: 'low',
      category: 'inconsistency',
      status: 'pending',
      copyText: 'Atualizar o gerador de PDF (src/lib/generatePdf.ts) para usar o conteúdo gerado pela IA quando disponível, ao invés de sempre usar as patternDefinitions hardcoded. O DiagnosticResult já contém os dados da IA, garantir que o PDF reflita esses dados.',
    },
    {
      id: 'imp-test-coverage',
      title: 'Cobertura de testes automatizados praticamente inexistente',
      description: 'Só existe um arquivo de teste exemplo (src/test/example.test.ts). Nenhuma lógica de negócio tem teste automatizado.',
      priority: 'low',
      category: 'improvement',
      status: 'pending',
      copyText: 'Adicionar testes automatizados para a lógica de negócio principal: (1) centralProfile.ts - geração de perfil unificado, (2) analysis.ts - análise de respostas, (3) AuthContext - resolução de roles, (4) Edge functions - analyze-test e generate-insights. Usar vitest que já está configurado.',
    },
  ];
}

const STORAGE_KEY = 'admin_roadmap_status';

function loadStatuses(): Record<string, Status> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveStatuses(statuses: Record<string, Status>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
}

const AdminRoadmap = () => {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPriority, setExpandedPriority] = useState<Record<Priority, boolean>>({
    critical: true, high: true, medium: true, low: false,
  });
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!authLoading && isSuperAdmin) {
      const generated = generateTasks();
      const savedStatuses = loadStatuses();
      const withSavedStatus = generated.map(t => ({
        ...t,
        status: savedStatuses[t.id] || t.status,
      }));
      setTasks(withSavedStatus);
    }
  }, [authLoading, isSuperAdmin]);

  const updateTaskStatus = (taskId: string, newStatus: Status) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      const statuses = loadStatuses();
      statuses[taskId] = newStatus;
      saveStatuses(statuses);
      return updated;
    });
    toast.success(`Status atualizado para "${statusConfig[newStatus].label}"`);
  };

  const handleCopy = async (task: RoadmapTask) => {
    try {
      await navigator.clipboard.writeText(task.copyText);
      setCopiedId(task.id);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = tasks.filter(t => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const groupedByPriority = (['critical', 'high', 'medium', 'low'] as Priority[]).map(p => ({
    priority: p,
    tasks: filtered.filter(t => t.priority === p),
  })).filter(g => g.tasks.length > 0);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-muted-foreground/60 hover:text-foreground/80 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-amber-500/60 font-semibold">Super Admin</p>
              <h1 className="text-2xl md:text-3xl">Roadmap do Projeto</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/prompts')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-xl text-[0.75rem] font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Central de IA
            </button>
          </div>
        </motion.div>

        {/* Progress Overview */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[0.9rem] font-semibold text-foreground/80">Progresso Geral</h3>
            <span className="text-[0.75rem] font-mono text-muted-foreground/50">{doneTasks}/{totalTasks} tarefas</span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2 mb-4">
            <div
              className="bg-gradient-to-r from-emerald-500 to-primary rounded-full h-2 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-semibold text-red-400">{pendingTasks}</p>
              <p className="text-[0.65rem] text-muted-foreground/50 uppercase tracking-[0.1em]">Pendentes</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-amber-400">{inProgressTasks}</p>
              <p className="text-[0.65rem] text-muted-foreground/50 uppercase tracking-[0.1em]">Em progresso</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-emerald-400">{doneTasks}</p>
              <p className="text-[0.65rem] text-muted-foreground/50 uppercase tracking-[0.1em]">Concluídas</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-card/60 rounded-xl border border-border/40 p-1">
            {(['all', ...Object.keys(categoryConfig)] as (Category | 'all')[]).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[0.7rem] font-medium transition-all ${
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/30'
                }`}
              >
                {cat === 'all' ? 'Todos' : categoryConfig[cat].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-card/60 rounded-xl border border-border/40 p-1">
            {(['all', 'pending', 'in_progress', 'done'] as (Status | 'all')[]).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-[0.7rem] font-medium transition-all ${
                  filterStatus === st
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/30'
                }`}
              >
                {st === 'all' ? 'Todos' : statusConfig[st].label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Task Groups */}
        {groupedByPriority.map((group, gIdx) => {
          const pConfig = priorityConfig[group.priority];
          const PIcon = pConfig.icon;
          const isExpanded = expandedPriority[group.priority];

          return (
            <motion.div
              key={group.priority}
              {...fadeUp}
              transition={{ delay: 0.1 + gIdx * 0.04 }}
              className={`rounded-2xl border ${pConfig.borderColor} overflow-hidden`}
            >
              <button
                onClick={() => setExpandedPriority(prev => ({ ...prev, [group.priority]: !prev[group.priority] }))}
                className={`w-full flex items-center justify-between px-5 py-4 ${pConfig.bgColor} hover:brightness-95 transition-all`}
              >
                <div className="flex items-center gap-3">
                  <PIcon className={`w-4.5 h-4.5 ${pConfig.color}`} />
                  <span className={`text-[0.85rem] font-semibold ${pConfig.color}`}>
                    {pConfig.label}
                  </span>
                  <span className="text-[0.7rem] text-muted-foreground/50 bg-background/50 px-2 py-0.5 rounded-full">
                    {group.tasks.length} {group.tasks.length === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
              </button>

              {isExpanded && (
                <div className="divide-y divide-border/30">
                  {group.tasks.map(task => {
                    const catConfig = categoryConfig[task.category];
                    const CatIcon = catConfig.icon;
                    const stConfig = statusConfig[task.status];
                    const StIcon = stConfig.icon;

                    return (
                      <div key={task.id} className={`px-5 py-4 bg-card/40 ${task.status === 'done' ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold ${pConfig.bgColor} ${pConfig.color} border ${pConfig.borderColor}`}>
                                <CatIcon className="w-2.5 h-2.5" />
                                {catConfig.label}
                              </span>
                              <button
                                onClick={() => {
                                  const nextStatus: Record<Status, Status> = { pending: 'in_progress', in_progress: 'done', done: 'pending' };
                                  updateTaskStatus(task.id, nextStatus[task.status]);
                                }}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold border border-border/30 hover:border-border/60 transition-colors cursor-pointer ${stConfig.color}`}
                              >
                                <StIcon className="w-2.5 h-2.5" />
                                {stConfig.label}
                              </button>
                            </div>
                            <h4 className={`text-[0.85rem] font-medium ${task.status === 'done' ? 'line-through text-muted-foreground/50' : 'text-foreground/85'}`}>
                              {task.title}
                            </h4>
                            <p className="text-[0.75rem] text-muted-foreground/55 leading-[1.6] mt-1">
                              {task.description}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy(task)}
                            className="shrink-0 p-2.5 rounded-xl border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                            title="Copiar tarefa para enviar"
                          >
                            {copiedId === task.id
                              ? <Check className="w-4 h-4 text-emerald-500" />
                              : <Copy className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/60" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <motion.div {...fadeUp} className="text-center py-12">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
            <p className="text-[0.9rem] text-muted-foreground/60">Nenhuma tarefa encontrada com os filtros selecionados.</p>
          </motion.div>
        )}

        <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="text-center pb-8">
          <p className="text-[0.7rem] text-muted-foreground/30">
            Roadmap atualizado automaticamente · Clique no status para alternar · Use o botão copiar para enviar tarefas
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminRoadmap;
