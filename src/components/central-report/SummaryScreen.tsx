import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, Users, User, Brain, Layers, Activity, Zap,
  Lock, Crown, Eye, ClipboardList, CheckCircle2, ChevronRight,
} from 'lucide-react';
import type { PatternKey } from '@/types/diagnostic';
import { fadeUp, type ManagedPerson, type PersonSummary } from './types';

interface SummaryScreenProps {
  managedPersons: ManagedPerson[];
  personSummaries: PersonSummary[];
  totalTests: number;
  hasAccess: boolean;
  patternDefinitions: Record<string, any> | undefined;
  onSelectPerson: (id: string) => void;
}

const fakeRadarPreview = [
  { axis: 'Execução', value: 72 }, { axis: 'Emocional', value: 58 },
  { axis: 'Sobrecarga', value: 65 }, { axis: 'Fuga', value: 44 },
  { axis: 'Perfeccionismo', value: 81 },
];

const fakePatternBars = [
  { label: 'Perfeccionismo Paralisante', score: 81 },
  { label: 'Execução Instável', score: 72 },
  { label: 'Autocrítica Excessiva', score: 69 },
  { label: 'Sobrecarga Funcional', score: 65 },
  { label: 'Autossabotagem Emocional', score: 58 },
];

export function SummaryScreen({ managedPersons, personSummaries, totalTests, hasAccess, patternDefinitions, onSelectPerson }: SummaryScreenProps) {
  const navigate = useNavigate();
  const totalActions = personSummaries.reduce((s, p) => s + p.keyActions.length, 0);

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-serif">Relatório Central</h1>
            <p className="text-sm text-muted-foreground">Visão geral de todos os perfis e diagnósticos</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, value: managedPersons.length, label: 'Perfis Cadastrados' },
            { icon: ClipboardList, value: totalTests, label: 'Testes Realizados' },
            { icon: CheckCircle2, value: totalActions, label: 'Ações Propostas' },
            { icon: Brain, value: personSummaries.filter(s => s.dominantPattern).length, label: 'Perfis Analisados' },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-sm text-center">
              <kpi.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-3xl font-serif font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Person Cards */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Selecione um perfil para visualizar
          </h2>
          <div className="space-y-3">
            {personSummaries.map((summary, i) => {
              const def = summary.dominantPattern ? patternDefinitions?.[summary.dominantPattern as PatternKey] : null;
              return (
                <motion.button
                  key={summary.person.id}
                  {...fadeUp}
                  transition={{ delay: 0.12 + i * 0.05 }}
                  onClick={() => hasAccess ? onSelectPerson(summary.person.id) : navigate('/checkout')}
                  className="w-full bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{summary.person.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {summary.person.age ? `${summary.person.age} anos` : ''} · CPF: ***{summary.person.cpf.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">{summary.testsCount} {summary.testsCount === 1 ? 'teste' : 'testes'}</p>
                        {summary.lastTestDate && (
                          <p className="text-xs text-muted-foreground">
                            Último: {new Date(summary.lastTestDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        )}
                      </div>
                      {def && (
                        <span className="hidden md:inline-flex text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium truncate max-w-[160px]">
                          {def.label}
                        </span>
                      )}
                      {summary.testsCount === 0 && (
                        <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">Sem testes</span>
                      )}
                      {!hasAccess && <Lock className="w-4 h-4 text-amber-500 shrink-0" />}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Blurred Preview — non-premium only */}
        {!hasAccess && (
          <div className="relative">
            <div className="pointer-events-none select-none space-y-6" style={{ filter: 'blur(5px)' }}>
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
                <div className="flex items-center gap-3 mb-3"><Brain className="w-5 h-5 text-primary" /><h3 className="text-lg font-serif">Padrão Dominante Global</h3></div>
                <p className="text-xl font-serif mb-2">Perfeccionismo Paralisante</p>
                <p className="text-sm text-foreground/70">Tendência a bloquear ação por medo de errar.</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4"><Layers className="w-5 h-5 text-primary" /><h3 className="text-lg font-serif">Combinação de Padrões</h3></div>
                <div className="space-y-3">
                  {fakePatternBars.map((bar, i) => (
                    <div key={i}><div className="flex justify-between mb-1"><span className="text-sm font-medium">{bar.label}</span><span className="text-xs text-muted-foreground">{bar.score}%</span></div><div className="w-full bg-muted/50 rounded-full h-2"><div className="bg-primary rounded-full h-2" style={{ width: `${bar.score}%` }} /></div></div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4"><Activity className="w-5 h-5 text-primary" /><h3 className="text-lg font-serif">Mapa de Funcionamento</h3></div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={fakeRadarPreview}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card rounded-xl border border-destructive/20 p-6">
                <div className="flex items-center gap-3 mb-3"><Zap className="w-5 h-5 text-destructive" /><h3 className="text-lg font-serif">Contradições Internas</h3></div>
                <div className="space-y-3">
                  <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-3"><p className="text-sm font-medium">Perfeccionismo × Execução Instável</p></div>
                  <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-3"><p className="text-sm font-medium">Autocrítica × Validação Externa</p></div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 z-30 flex items-center justify-center">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-card/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 max-w-sm mx-4 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.2)]">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-lg"><Eye className="w-6 h-6 text-white" /></div>
                <h3 className="text-lg font-serif text-foreground">Análise completa disponível</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {totalTests > 0 ? (<>Identificamos <span className="font-semibold text-foreground">{personSummaries.filter(s => s.dominantPattern).length} padrões</span> em <span className="font-semibold text-foreground">{totalTests} testes</span>. </>) : (<>Seus <span className="font-semibold text-foreground">{managedPersons.length} perfis</span> estão prontos para análise. </>)}
                  Desbloqueie para ver radar, conflitos e recomendações.
                </p>
                <button onClick={() => navigate('/checkout')} className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 mx-auto shadow-[0_8px_25px_-6px_rgba(217,160,32,0.4)]">
                  <Crown className="w-4 h-4" /> Desbloquear Relatório
                </button>
                <p className="text-[0.65rem] text-muted-foreground/50">A partir de R$ 5,99/mês</p>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
