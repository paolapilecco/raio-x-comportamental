import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, Send, Link2, Copy, Check, Activity,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { PersonData, TestEntry, TestModule, InviteData } from './types';
import { fadeUp, intensityLabel, COLORS } from './types';

interface OverviewTabProps {
  history: TestEntry[];
  modules: TestModule[];
  invites: InviteData[];
  axisLabels: Record<string, string>;
  gamification: any;
  copiedToken: string | null;
  generatingLink: string | null;
  onGenerateLink: (testModuleId: string) => void;
  onCopyExistingLink: (token: string, moduleId: string) => void;
}

export function OverviewTab({
  history, modules, invites, axisLabels, gamification,
  copiedToken, generatingLink, onGenerateLink, onCopyExistingLink,
}: OverviewTabProps) {
  const evolutionData = useMemo(() => {
    if (history.length < 2) return [];
    const reversed = [...history].reverse();
    const allKeys = new Set<string>();
    reversed.forEach(e => ((e.all_scores as any[]) || []).forEach((s: any) => allKeys.add(s.key)));
    const topKeysArr = [...allKeys].slice(0, 5);
    return reversed.map((entry, i) => {
      const point: Record<string, any> = {
        date: new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        index: i + 1,
      };
      ((entry.all_scores as any[]) || []).forEach((s: any) => {
        if (topKeysArr.includes(s.key)) point[axisLabels[s.key] || s.key] = s.percentage;
      });
      return point;
    });
  }, [history, axisLabels]);

  const topKeys = useMemo(() => {
    if (history.length === 0) return [];
    const latest = history[0];
    return ((latest.all_scores as any[]) || [])
      .sort((a: any, b: any) => b.percentage - a.percentage)
      .slice(0, 5)
      .map((s: any) => s.key);
  }, [history]);

  const progressData = useMemo(() => {
    if (history.length < 2) return [];
    const latest = history[0];
    const oldest = history[history.length - 1];
    return ((latest.all_scores as any[]) || []).map((s: any) => {
      const oldScore = ((oldest.all_scores as any[]) || []).find((o: any) => o.key === s.key);
      const diff = s.percentage - (oldScore?.percentage || 0);
      return { key: s.key, label: axisLabels[s.key] || s.key, current: s.percentage, diff };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [history, axisLabels]);

  const radarData = useMemo(() => {
    if (history.length === 0) return [];
    const latest = history[0];
    const prev = history.length > 1 ? history[1] : null;
    return ((latest.all_scores as any[]) || [])
      .sort((a: any, b: any) => b.percentage - a.percentage)
      .slice(0, 6)
      .map((s: any) => {
        const prevScore = prev ? ((prev.all_scores as any[]) || []).find((p: any) => p.key === s.key) : null;
        return { axis: axisLabels[s.key] || s.key, atual: s.percentage, anterior: prevScore?.percentage || 0 };
      });
  }, [history, axisLabels]);

  return (
    <motion.div key="overview" {...fadeUp} className="space-y-6">
      {/* Gamification Section */}
      {!gamification.loading && gamification.totalTests > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Score Global */}
            <div className="bg-card border rounded-xl p-5 flex items-center gap-5">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - gamification.globalScore / 100)}`}
                    strokeLinecap="round" className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                  {gamification.globalScore}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Score Global</p>
                <p className="text-xs text-muted-foreground mt-1">Autoconsciência × Consistência</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">🧠 {gamification.scoreBreakdown.awareness}%</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">🔥 {gamification.scoreBreakdown.consistency}%</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">📊 {gamification.scoreBreakdown.coverage}%</span>
                </div>
              </div>
            </div>

            {/* Retest Cycle */}
            <div className="bg-card border rounded-xl p-5 flex items-center gap-5">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none"
                    stroke={gamification.retestAvailable ? 'hsl(152,45%,42%)' : 'hsl(var(--primary))'}
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - gamification.retestProgressPercent / 100)}`}
                    strokeLinecap="round" className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                  {gamification.retestAvailable ? '✓' : `${gamification.daysUntilRetest}d`}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ciclo de Reteste</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {gamification.retestAvailable ? 'Reteste disponível!' : `${gamification.daysUntilRetest} dias restantes`}
                </p>
                {gamification.lastTestDate && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Último: {gamification.lastTestDate.toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Streak, Nível, XP, Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{gamification.currentStreak}</p>
              <p className="text-xs text-muted-foreground mt-1">🔥 Streak (semanas)</p>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{gamification.level}</p>
              <p className="text-xs text-muted-foreground mt-1">📊 {gamification.levelName}</p>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{gamification.totalXP}</p>
              <p className="text-xs text-muted-foreground mt-1">⚡ XP Total</p>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{gamification.unlockedBadges}/{gamification.badges.length}</p>
              <p className="text-xs text-muted-foreground mt-1">🏆 Conquistas</p>
            </div>
          </div>

          {/* Badges */}
          {gamification.badges.length > 0 && (
            <div className="bg-card border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Conquistas do Paciente</h3>
              <div className="flex flex-wrap gap-2">
                {gamification.badges.map((badge: any) => (
                  <span key={badge.id} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                    badge.unlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground opacity-50'
                  }`}>
                    {badge.emoji} {badge.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Score Comparisons */}
          {gamification.scoreComparisons.length > 0 && (
            <div className="bg-card border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Comparação entre Últimos Testes</h3>
              <div className="space-y-2">
                {gamification.scoreComparisons.slice(0, 6).map((sc: any) => (
                  <div key={sc.key} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 truncate text-right">{sc.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${sc.current}%`,
                        backgroundColor: sc.current >= 70 ? 'hsl(0,65%,52%)' : sc.current >= 40 ? 'hsl(38,72%,50%)' : 'hsl(152,45%,42%)',
                      }} />
                    </div>
                    <div className="flex items-center gap-1 w-14 justify-end">
                      {sc.delta > 0 ? <TrendingUp className="w-3 h-3 text-red-500" /> : sc.delta < 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                      <span className={`text-xs font-semibold ${sc.delta > 0 ? 'text-red-500' : sc.delta < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {sc.delta > 0 ? '+' : ''}{sc.delta}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{history.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Testes realizados</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {new Set(history.map(h => h.test_module_id).filter(Boolean)).size}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Categorias</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{history[0]?.intensity ? intensityLabel[history[0].intensity] : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Intensidade atual</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-xs text-muted-foreground mt-1">Notas</p>
        </div>
      </div>

      {/* Radar */}
      {radarData.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-lg font-serif mb-4">Mapa Comportamental Atual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar name="Atual" dataKey="atual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
              {history.length > 1 && (
                <Radar name="Anterior" dataKey="anterior" stroke="hsl(var(--muted-foreground))" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
              )}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Evolution Chart */}
      {evolutionData.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-lg font-serif mb-4">Evolução ao Longo do Tempo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {topKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={axisLabels[key] || key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Progress Indicators */}
      {progressData.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-lg font-serif mb-4">Progresso Geral</h3>
          <p className="text-xs text-muted-foreground mb-4">Comparação entre o primeiro e o último teste</p>
          <div className="space-y-3">
            {progressData.map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 truncate text-right">{item.label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${item.current}%`,
                    backgroundColor: item.current >= 70 ? 'hsl(0,65%,52%)' : item.current >= 40 ? 'hsl(38,72%,50%)' : 'hsl(152,45%,42%)',
                  }} />
                </div>
                <div className="flex items-center gap-1 w-16 justify-end">
                  {item.diff > 0 ? <TrendingUp className="w-3 h-3 text-red-500" /> : item.diff < 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                  <span className={`text-xs font-semibold ${item.diff > 0 ? 'text-red-500' : item.diff < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {item.diff > 0 ? '+' : ''}{item.diff}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Catalog - Send Link */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Enviar Teste para Paciente</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Gere um link único para a paciente responder sem precisar de cadastro. O link expira em 7 dias e só pode ser usado uma vez.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modules.map(mod => {
            const pendingInvite = invites.find(inv => inv.test_module_id === mod.id && inv.status === 'pending' && new Date(inv.expires_at) > new Date());
            const isGenerating = generatingLink === mod.id;
            const isCopied = copiedToken === mod.id;
            return (
              <div key={mod.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg bg-background">
                <span className="text-xs font-medium text-foreground truncate flex-1">{mod.name}</span>
                {pendingInvite ? (
                  <button
                    onClick={() => onCopyExistingLink(pendingInvite.token, mod.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                      isCopied ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? 'Copiado!' : 'Copiar Link'}
                  </button>
                ) : (
                  <button
                    onClick={() => onGenerateLink(mod.id)}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <div className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Link2 className="w-3 h-3" />
                    )}
                    Gerar Link
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {history.length === 0 && (
        <div className="text-center py-12 bg-card border rounded-xl">
          <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum teste realizado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Use os links acima para enviar testes à paciente.</p>
        </div>
      )}
    </motion.div>
  );
}
