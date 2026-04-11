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
import { trackEvent } from '@/lib/trackEvent';

const iconMap: Record<string, any> = { brain: Brain, zap: Zap, shield: Shield, heart: Heart };

interface TestModule {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  question_count: number;
}

const fadeUp = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

const Premium = () => {
  const { user, isPremium, isSuperAdmin, signOut } = useAuth();
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

  const featureSections = [
    {
      id: 'reports',
      num: '02',
      icon: FileText,
      title: 'Relatórios',
      subtitle: 'Diagnósticos completos e detalhados',
      description: 'Relatórios profundos com diagnóstico crítico, identificação da dor central, protocolo de saída do ciclo e análise de impacto em todos os pilares da vida.',
      path: '/central-report',
      features: [
        { icon: Target, label: 'Diagnóstico Crítico', desc: 'Análise profunda do seu funcionamento interno' },
        { icon: Compass, label: 'Dor Central', desc: 'Identificação precisa do ponto de bloqueio' },
        { icon: BookOpen, label: 'Protocolo de Saída', desc: 'Passos concretos e personalizados para evolução' },
        { icon: BarChart3, label: 'Impacto nos Pilares', desc: 'Carreira, saúde, finanças, relacionamentos' },
      ],
    },
    {
      id: 'tracking',
      num: '03',
      icon: TrendingUp,
      title: 'Acompanhamento',
      subtitle: 'Monitoramento comportamental contínuo',
      description: 'Acompanhe como seus padrões evoluem ao longo do tempo com visualizações inteligentes e perfil central unificado.',
      path: '/central-report',
      features: [
        { icon: LineChart, label: 'Evolução Temporal', desc: 'Gráficos de progresso dos seus padrões' },
        { icon: Brain, label: 'Perfil Central Unificado', desc: 'Consolidação de todas as suas leituras' },
        { icon: Sparkles, label: 'Tendências Comportamentais', desc: 'Previsão de padrões futuros' },
      ],
    },
    {
      id: 'timeline',
      num: '04',
      icon: CalendarDays,
      title: 'Cronograma de Evolução',
      subtitle: 'Sua jornada de transformação',
      description: 'Visualize sua jornada de autoconhecimento com marcos, conquistas e progressos ao longo do tempo em uma timeline interativa.',
      path: '/central-report',
      features: [
        { icon: Star, label: 'Marcos de Evolução', desc: 'Momentos de transformação identificados' },
        { icon: CheckCircle2, label: 'Conquistas', desc: 'Padrões superados e avanços registrados' },
        { icon: CalendarDays, label: 'Timeline Visual', desc: 'Linha do tempo interativa e detalhada' },
      ],
    },
    {
      id: 'history',
      num: '05',
      icon: History,
      title: 'Histórico',
      subtitle: 'Registro completo de leituras',
      description: 'Acesse todas as suas leituras anteriores, compare resultados lado a lado e acompanhe mudanças nos seus padrões.',
      path: '/history',
      features: [
        { icon: History, label: 'Leituras Anteriores', desc: 'Acesso completo a todos os resultados' },
        { icon: BarChart3, label: 'Comparação', desc: 'Compare leituras lado a lado' },
        { icon: FileText, label: 'Download de PDFs', desc: 'Relatórios para guardar ou compartilhar' },
      ],
    },
    {
      id: 'recommendations',
      num: '06',
      icon: Lightbulb,
      title: 'Recomendações',
      subtitle: 'Orientações personalizadas',
      description: 'Receba orientações sob medida com base no seu perfil comportamental único — insights, próximos passos e conteúdos exclusivos.',
      comingSoon: true,
      features: [
        { icon: Lightbulb, label: 'Insights Personalizados', desc: 'Baseados no seu perfil único' },
        { icon: Target, label: 'Próximos Passos', desc: 'Ações concretas para o seu momento' },
        { icon: Gem, label: 'Conteúdos Exclusivos', desc: 'Material curado para seu padrão' },
      ],
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ── Header ── */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="space-y-4">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao painel
          </button>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15)]">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-primary/50 font-semibold mb-1">Experiência Completa</p>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em]">Acesso Premium</h1>
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
          </div>
        </motion.div>

        {/* ── Status Banner ── */}
        {canAccess ? (
          <motion.div {...fadeUp} transition={{ delay: 0.03 }} className="flex items-center gap-3 bg-primary/[0.06] border border-primary/15 rounded-xl px-5 py-3.5">
            <CheckCircle2 className="w-5 h-5 text-primary/70 shrink-0" />
            <div>
              <p className="text-[0.82rem] font-medium text-foreground/80">Seu acesso Premium está ativo</p>
              <p className="text-[0.72rem] text-muted-foreground/55">Você tem acesso completo a todas as 6 áreas abaixo.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div {...fadeUp} transition={{ delay: 0.03 }} className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-6 md:p-8">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">Desbloqueie todo o potencial</p>
                <p className="text-[0.82rem] text-muted-foreground/65 leading-[1.65] max-w-md">
                  6 áreas completas de autoconhecimento — análises avançadas, relatórios, acompanhamento, cronograma, histórico e recomendações.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['6 áreas', '10+ análises', 'PDF ilimitado', 'Evolução temporal'].map((tag) => (
                    <span key={tag} className="text-[0.65rem] font-medium text-primary/70 bg-primary/[0.06] px-2.5 py-1 rounded-full border border-primary/10">{tag}</span>
                  ))}
                </div>
              </div>
              <button className="group flex items-center gap-2 px-7 py-3 bg-primary text-primary-foreground rounded-2xl text-[0.85rem] font-semibold shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300 whitespace-nowrap">
                <Crown className="w-4 h-4" />
                Upgrade Premium
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Section Index (quick nav) ── */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { num: '01', label: 'Análises', icon: LayoutGrid },
            { num: '02', label: 'Relatórios', icon: FileText },
            { num: '03', label: 'Acompanhamento', icon: TrendingUp },
            { num: '04', label: 'Cronograma', icon: CalendarDays },
            { num: '05', label: 'Histórico', icon: History },
            { num: '06', label: 'Recomendações', icon: Lightbulb },
          ].map((item) => (
            <a
              key={item.num}
              href={`#section-${item.num}`}
              className="group bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-3 text-center hover:border-primary/20 hover:bg-primary/[0.03] transition-all duration-200"
            >
              <item.icon className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/50 mx-auto mb-1.5 transition-colors" />
              <p className="text-[0.68rem] font-medium text-foreground/60 group-hover:text-foreground/80 transition-colors">{item.label}</p>
              <p className="text-[0.55rem] text-muted-foreground/30 font-mono mt-0.5">{item.num}</p>
            </a>
          ))}
        </motion.div>

        {/* ══════════════════════════════════════════════
            SECTION 01 — ANÁLISES PREMIUM
        ══════════════════════════════════════════════ */}
        <motion.div id="section-01" {...fadeUp} transition={{ delay: 0.08 }} className="space-y-5">
          <div className="flex items-center gap-4">
            <span className="text-[2rem] font-light text-primary/15 font-mono leading-none">01</span>
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-4.5 h-4.5 text-primary/60" />
                <h2 className="text-xl font-semibold tracking-[-0.01em]">Análises Premium</h2>
              </div>
              <p className="text-[0.78rem] text-muted-foreground/55 mt-0.5 leading-[1.6]">
                Vá além do padrão comportamental com análises profundas em áreas específicas da sua vida.
              </p>
            </div>
            {canAccess && (
              <button onClick={() => navigate('/tests')} className="text-[0.75rem] text-primary/70 hover:text-primary font-medium transition-colors whitespace-nowrap flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            )}
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
                  transition={{ delay: 0.1 + i * 0.04, duration: 0.4 }}
                  onClick={() => canAccess ? navigate(`/diagnostic/${mod.slug}`) : undefined}
                  className={`relative bg-card/70 backdrop-blur-sm rounded-2xl border p-5 transition-all duration-300 ${
                    canAccess ? 'border-border/50 hover:border-primary/25 hover:shadow-[0_4px_20px_-6px_hsl(var(--primary)/0.1)] cursor-pointer group' : 'border-border/30'
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
                    <div className="p-2.5 rounded-xl bg-primary/[0.04] border border-primary/10 w-fit group-hover:bg-primary/[0.08] transition-colors">
                      <Icon className={`w-5 h-5 ${canAccess ? 'text-primary/50' : 'text-muted-foreground/30'}`} />
                    </div>
                    <div>
                      <h4 className={`text-[0.9rem] font-medium mb-1 tracking-[-0.01em] ${canAccess ? 'text-foreground/85' : 'text-foreground/50'}`}>{mod.name}</h4>
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

        {/* ══════════════════════════════════════════════
            SECTIONS 02–06 — FEATURE AREAS
        ══════════════════════════════════════════════ */}
        {featureSections.map((section, sIdx) => (
          <motion.div key={section.id} id={`section-${section.num}`} {...fadeUp} transition={{ delay: 0.12 + sIdx * 0.04 }}>
            <div className={`rounded-2xl border overflow-hidden ${
              section.comingSoon ? 'bg-card/30 border-border/25' : 'bg-card/70 border-border/50'
            }`}>
              {/* Section Header */}
              <div className={`p-6 md:px-8 md:pt-8 md:pb-6 ${!section.comingSoon ? 'border-b border-border/30' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className={`text-[2rem] font-light font-mono leading-none ${section.comingSoon ? 'text-muted-foreground/10' : 'text-primary/15'}`}>{section.num}</span>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <section.icon className={`w-4.5 h-4.5 ${section.comingSoon ? 'text-muted-foreground/30' : 'text-primary/60'}`} />
                        <h2 className={`text-xl font-semibold tracking-[-0.01em] ${section.comingSoon ? 'text-foreground/40' : ''}`}>{section.title}</h2>
                        {section.comingSoon && (
                          <span className="text-[0.6rem] font-semibold tracking-[0.15em] uppercase bg-muted/40 text-muted-foreground/50 px-2.5 py-0.5 rounded-full">Em breve</span>
                        )}
                      </div>
                      <p className={`text-[0.72rem] tracking-[0.05em] uppercase font-medium mt-0.5 ${section.comingSoon ? 'text-muted-foreground/25' : 'text-primary/40'}`}>{section.subtitle}</p>
                    </div>
                  </div>
                  {!section.comingSoon && canAccess && section.path && (
                    <button
                      onClick={() => navigate(section.path!)}
                      className="flex items-center gap-1.5 text-[0.75rem] text-primary/70 hover:text-primary font-medium transition-colors whitespace-nowrap mt-1"
                    >
                      Acessar <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className={`text-[0.82rem] leading-[1.7] mt-3 max-w-2xl ${section.comingSoon ? 'text-muted-foreground/30' : 'text-muted-foreground/60'}`}>
                  {section.description}
                </p>
              </div>

              {/* Feature Cards */}
              <div className={`p-5 md:p-8 ${section.features.length === 4 ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-3' : 'grid sm:grid-cols-3 gap-3'}`}>
                {section.features.map((feat, fIdx) => (
                  <div
                    key={fIdx}
                    className={`rounded-xl border p-4 transition-all duration-200 ${
                      section.comingSoon
                        ? 'bg-muted/5 border-border/15'
                        : canAccess
                        ? 'bg-primary/[0.02] border-primary/10 hover:border-primary/20 hover:bg-primary/[0.04]'
                        : 'bg-muted/5 border-border/25'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg w-fit mb-2.5 ${
                      section.comingSoon ? 'bg-muted/10' : canAccess ? 'bg-primary/[0.06]' : 'bg-muted/10'
                    }`}>
                      <feat.icon className={`w-4 h-4 ${section.comingSoon ? 'text-muted-foreground/20' : canAccess ? 'text-primary/50' : 'text-muted-foreground/25'}`} />
                    </div>
                    <p className={`text-[0.82rem] font-medium mb-1 ${section.comingSoon ? 'text-foreground/30' : 'text-foreground/75'}`}>{feat.label}</p>
                    <p className={`text-[0.72rem] leading-[1.6] ${section.comingSoon ? 'text-muted-foreground/20' : 'text-muted-foreground/50'}`}>{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}

        {/* ── Bottom CTA for free users ── */}
        {!canAccess && (
          <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-transparent to-primary/[0.03] p-10 text-center space-y-5">
            <div className="absolute top-0 left-1/2 w-60 h-60 bg-primary/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="relative space-y-3">
              <Crown className="w-8 h-8 text-primary/40 mx-auto" />
              <h3 className="text-xl font-semibold">Pronto para se conhecer de verdade?</h3>
              <p className="text-[0.85rem] text-muted-foreground/55 max-w-md mx-auto leading-[1.7]">
                Desbloqueie as 6 áreas completas e tenha uma visão profunda dos seus padrões comportamentais.
              </p>
            </div>
            <button className="relative group inline-flex items-center gap-2.5 px-10 py-[1rem] bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300">
              <Crown className="w-4 h-4" />
              Upgrade para Premium
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[0.7rem] text-muted-foreground/30">Cancele quando quiser · Acesso imediato</p>
          </motion.div>
        )}

        {/* ── Bottom nav for premium users ── */}
        {canAccess && (
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3 justify-center pb-12 pt-4">
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
