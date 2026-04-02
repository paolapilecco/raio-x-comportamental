import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Crown, Brain, Zap, Shield, Heart, Lock, ArrowRight, ArrowLeft,
  LayoutGrid, History, FileText, TrendingUp, Sparkles, Target,
  Clock, CheckCircle2, BarChart3, CalendarDays, Lightbulb, Compass,
  LineChart, BookOpen, Star, Gem, User, LogOut
} from 'lucide-react';

const iconMap: Record<string, any> = { brain: Brain, zap: Zap, shield: Shield, heart: Heart };

interface TestModule {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  question_count: number;
}

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const Premium = () => {
  const { user, profile, isPremium, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<TestModule[]>([]);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const canAccess = isPremium || isSuperAdmin;

  useEffect(() => {
    const fetchData = async () => {
      const [modulesRes, sessionsRes] = await Promise.all([
        supabase.from('test_modules').select('id, slug, name, description, icon, question_count').eq('is_active', true).order('sort_order'),
        user ? supabase.from('diagnostic_sessions').select('test_module_id').eq('user_id', user.id).not('completed_at', 'is', null).not('test_module_id', 'is', null) : Promise.resolve({ data: [] }),
      ]);
      setModules((modulesRes.data as TestModule[]) || []);
      if (sessionsRes.data) {
        setCompletedModules(new Set(sessionsRes.data.map((s: any) => s.test_module_id).filter(Boolean)));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const premiumModules = modules.filter(m => m.slug !== 'padrao-comportamental');

  const sections = [
    {
      id: 'tests',
      icon: LayoutGrid,
      title: 'Módulos de Análise Avançada',
      description: 'Vá além do padrão comportamental com análises profundas em áreas específicas da sua vida.',
      color: 'primary',
    },
    {
      id: 'reports',
      icon: FileText,
      title: 'Relatórios Completos',
      description: 'Relatórios detalhados com diagnóstico crítico, dor central, protocolo de saída e impacto nos pilares da vida.',
      color: 'primary',
      features: [
        { icon: Target, label: 'Diagnóstico Crítico', desc: 'Análise profunda do seu funcionamento' },
        { icon: Compass, label: 'Dor Central', desc: 'Identificação precisa do ponto de bloqueio' },
        { icon: BookOpen, label: 'Protocolo de Saída', desc: 'Passos concretos para evolução' },
        { icon: BarChart3, label: 'Impacto nos Pilares', desc: 'Carreira, saúde, finanças, relacionamentos' },
      ],
    },
    {
      id: 'tracking',
      icon: TrendingUp,
      title: 'Acompanhamento Comportamental',
      description: 'Acompanhe como seus padrões evoluem ao longo do tempo com visualizações inteligentes.',
      color: 'primary',
      features: [
        { icon: LineChart, label: 'Evolução Temporal', desc: 'Gráficos de progresso dos seus padrões' },
        { icon: Brain, label: 'Perfil Central Unificado', desc: 'Consolidação de todos os seus testes' },
        { icon: Sparkles, label: 'Tendências Comportamentais', desc: 'Previsão de padrões futuros' },
      ],
    },
    {
      id: 'timeline',
      icon: CalendarDays,
      title: 'Cronograma de Evolução',
      description: 'Visualize sua jornada de autoconhecimento com marcos, conquistas e progressos ao longo do tempo.',
      color: 'primary',
      features: [
        { icon: Star, label: 'Marcos de Evolução', desc: 'Momentos de transformação identificados' },
        { icon: CheckCircle2, label: 'Conquistas', desc: 'Padrões superados e avanços' },
        { icon: CalendarDays, label: 'Timeline Visual', desc: 'Linha do tempo interativa' },
      ],
    },
    {
      id: 'history',
      icon: History,
      title: 'Histórico Detalhado',
      description: 'Acesse todas as suas leituras anteriores, compare resultados e acompanhe mudanças.',
      color: 'primary',
      features: [
        { icon: History, label: 'Leituras Anteriores', desc: 'Acesso completo a todos os resultados' },
        { icon: BarChart3, label: 'Comparação de Resultados', desc: 'Compare testes lado a lado' },
        { icon: FileText, label: 'Download de PDFs', desc: 'Relatórios para guardar ou compartilhar' },
      ],
    },
    {
      id: 'recommendations',
      icon: Lightbulb,
      title: 'Recomendações Personalizadas',
      description: 'Receba orientações sob medida com base no seu perfil comportamental único.',
      color: 'primary',
      features: [
        { icon: Lightbulb, label: 'Insights Personalizados', desc: 'Baseados no seu perfil único' },
        { icon: Target, label: 'Próximos Passos', desc: 'Ações concretas para o seu momento' },
        { icon: Gem, label: 'Conteúdos Exclusivos', desc: 'Material curado para seu padrão' },
      ],
      comingSoon: true,
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors mb-3">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao painel
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold">Acesso Premium</h1>
                <p className="text-[0.82rem] text-muted-foreground/60 mt-0.5">O ecossistema completo de autoconhecimento</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/profile')} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card/60">
              <User className="w-3.5 h-3.5" /> Perfil
            </button>
            <button onClick={async () => { await signOut(); navigate('/'); }} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card/60">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </motion.div>

        {/* ── Status Banner ── */}
        {canAccess ? (
          <motion.div {...fadeUp} transition={{ delay: 0.03 }} className="flex items-center gap-3 bg-primary/[0.06] border border-primary/15 rounded-xl px-5 py-3.5">
            <CheckCircle2 className="w-5 h-5 text-primary/70 shrink-0" />
            <div>
              <p className="text-[0.82rem] font-medium text-foreground/80">Seu acesso Premium está ativo</p>
              <p className="text-[0.72rem] text-muted-foreground/55">Você tem acesso completo a todas as áreas abaixo.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div {...fadeUp} transition={{ delay: 0.03 }} className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-[0.9rem] font-semibold text-foreground">Desbloqueie todo o potencial da plataforma</p>
                <p className="text-[0.78rem] text-muted-foreground/65 leading-[1.65] max-w-md">
                  Com o Premium você acessa todos os módulos, relatórios completos, acompanhamento e recomendações personalizadas.
                </p>
              </div>
              <button className="group flex items-center gap-2 px-7 py-3 bg-primary text-primary-foreground rounded-2xl text-[0.85rem] font-semibold shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300 whitespace-nowrap">
                <Crown className="w-4 h-4" />
                Upgrade Premium
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Section 1: Premium Tests ── */}
        <motion.div {...fadeUp} transition={{ delay: 0.06 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/[0.06] border border-primary/10">
              <LayoutGrid className="w-4.5 h-4.5 text-primary/60" />
            </div>
            <div>
              <h2 className="text-lg font-medium">{sections[0].title}</h2>
              <p className="text-[0.78rem] text-muted-foreground/55">{sections[0].description}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {premiumModules.map((mod, i) => {
              const Icon = iconMap[mod.icon] || Brain;
              const isCompleted = completedModules.has(mod.id);
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.04, duration: 0.4 }}
                  onClick={() => canAccess ? navigate(`/diagnostic/${mod.slug}`) : undefined}
                  className={`relative bg-card/70 backdrop-blur-sm rounded-2xl border p-5 transition-all duration-300 ${
                    canAccess ? 'border-border/50 hover:border-primary/25 cursor-pointer group' : 'border-border/30'
                  }`}
                >
                  {isCompleted && canAccess && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-4 h-4 text-primary/60" />
                    </div>
                  )}
                  {!canAccess && (
                    <div className="absolute top-3 right-3">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-primary/[0.04] border border-primary/10 w-fit">
                      <Icon className={`w-5 h-5 ${canAccess ? 'text-primary/50' : 'text-muted-foreground/30'}`} />
                    </div>
                    <div>
                      <h4 className={`text-[0.9rem] font-medium mb-1 ${canAccess ? 'text-foreground/85' : 'text-foreground/50'}`}>{mod.name}</h4>
                      <p className="text-[0.75rem] text-muted-foreground/55 leading-[1.65] line-clamp-2">{mod.description}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[0.68rem] text-muted-foreground/40">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{Math.ceil(mod.question_count * 0.5)} min</span>
                      <span>{mod.question_count} itens</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Feature Sections ── */}
        {sections.slice(1).map((section, sIdx) => (
          <motion.div key={section.id} {...fadeUp} transition={{ delay: 0.1 + sIdx * 0.04 }}>
            <div className={`rounded-2xl border p-6 md:p-8 ${
              section.comingSoon
                ? 'bg-card/40 border-border/30'
                : 'bg-card/70 border-border/50'
            }`}>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${
                    section.comingSoon
                      ? 'bg-muted/20 border-border/30'
                      : 'bg-primary/[0.06] border-primary/10'
                  }`}>
                    <section.icon className={`w-5 h-5 ${section.comingSoon ? 'text-muted-foreground/40' : 'text-primary/60'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-lg font-medium ${section.comingSoon ? 'text-foreground/50' : ''}`}>{section.title}</h2>
                      {section.comingSoon && (
                        <span className="text-[0.6rem] font-semibold tracking-[0.15em] uppercase bg-muted/40 text-muted-foreground/50 px-2.5 py-0.5 rounded-full">Em breve</span>
                      )}
                    </div>
                    <p className={`text-[0.78rem] leading-[1.65] mt-0.5 ${section.comingSoon ? 'text-muted-foreground/40' : 'text-muted-foreground/55'}`}>{section.description}</p>
                  </div>
                </div>
                {!section.comingSoon && canAccess && (
                  <button
                    onClick={() => {
                      if (section.id === 'history') navigate('/history');
                      else if (section.id === 'reports' || section.id === 'tracking' || section.id === 'timeline') navigate('/central-report');
                    }}
                    className="text-[0.75rem] text-primary/70 hover:text-primary font-medium transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    Acessar <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {section.features && (
                <div className="grid sm:grid-cols-3 gap-4">
                  {section.features.map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      className={`rounded-xl border p-4 transition-all duration-200 ${
                        section.comingSoon
                          ? 'bg-muted/10 border-border/20'
                          : canAccess
                          ? 'bg-primary/[0.02] border-primary/10 hover:border-primary/20'
                          : 'bg-muted/10 border-border/30'
                      }`}
                    >
                      <feat.icon className={`w-4 h-4 mb-2 ${section.comingSoon ? 'text-muted-foreground/25' : canAccess ? 'text-primary/50' : 'text-muted-foreground/30'}`} />
                      <p className={`text-[0.82rem] font-medium mb-0.5 ${section.comingSoon ? 'text-foreground/40' : 'text-foreground/75'}`}>{feat.label}</p>
                      <p className={`text-[0.72rem] leading-[1.6] ${section.comingSoon ? 'text-muted-foreground/30' : 'text-muted-foreground/50'}`}>{feat.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* ── Bottom CTA for free users ── */}
        {!canAccess && (
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="text-center py-8 space-y-5">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Pronto para se conhecer de verdade?</h3>
              <p className="text-[0.85rem] text-muted-foreground/60 max-w-md mx-auto leading-[1.7]">
                Desbloqueie o acesso completo e tenha uma visão profunda dos seus padrões comportamentais.
              </p>
            </div>
            <button className="group inline-flex items-center gap-2.5 px-10 py-[1rem] bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300">
              <Crown className="w-4 h-4" />
              Upgrade para Premium
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[0.7rem] text-muted-foreground/35">Cancele quando quiser · Acesso imediato</p>
          </motion.div>
        )}

        {/* ── Bottom nav for premium users ── */}
        {canAccess && (
          <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="flex flex-col sm:flex-row gap-3 justify-center pb-12 pt-4">
            <button
              onClick={() => navigate('/tests')}
              className="flex items-center justify-center gap-2.5 px-10 py-[1rem] bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold tracking-[0.02em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300"
            >
              <LayoutGrid className="w-4 h-4" /> Começar nova leitura
            </button>
            <button
              onClick={() => navigate('/central-report')}
              className="flex items-center justify-center gap-2.5 px-10 py-[1rem] border border-border/50 rounded-2xl text-[0.85rem] font-medium text-muted-foreground/70 hover:text-foreground/80 hover:border-border hover:bg-card/60 transition-all duration-300"
            >
              <FileText className="w-4 h-4" /> Ver Relatório Central
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Premium;
