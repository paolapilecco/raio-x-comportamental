import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, BarChart3, FileText, HelpCircle, Settings, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PROMPT_SECTIONS } from './promptConstants';
import type { TestModule, TestPrompt, TestAiConfig } from './promptConstants';

interface HealthMetrics {
  promptCoverage: number;      // 0-100: how many of 7 sections exist + are non-empty
  promptDepth: number;         // 0-100: avg chars across prompts (target: 2500+)
  axisCoverage: number;        // 0-100: % of question axes mentioned in prompts
  questionCount: number;       // raw count
  questionHealth: number;      // 0-100: based on count, option completeness
  hasAiConfig: boolean;
  hasTemplate: boolean;
  hasOutputRules: boolean;
  overallScore: number;        // weighted composite
  issues: string[];
}

interface Props {
  currentModule: TestModule;
  testPrompts: TestPrompt[];
  testAiConfigs: TestAiConfig[];
  questionCounts: Record<string, number>;
}

const ModuleHealthScore = ({ currentModule, testPrompts, testAiConfigs, questionCounts }: Props) => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);

  useEffect(() => {
    computeHealth();
  }, [currentModule.id, testPrompts, testAiConfigs, questionCounts]);

  const computeHealth = async () => {
    const modPrompts = testPrompts.filter(p => p.test_id === currentModule.id);
    const issues: string[] = [];

    // 1. Prompt coverage
    const filledSections = PROMPT_SECTIONS.filter(s => {
      const p = modPrompts.find(mp => mp.prompt_type === s.type);
      return p && p.is_active && p.content.trim().length > 50;
    });
    const promptCoverage = Math.round((filledSections.length / 7) * 100);
    if (promptCoverage < 100) issues.push(`${7 - filledSections.length} seção(ões) de prompt sem conteúdo`);

    // 2. Prompt depth
    const activePrompts = modPrompts.filter(p => p.is_active && p.content.trim().length > 0);
    const avgChars = activePrompts.length > 0
      ? activePrompts.reduce((sum, p) => sum + p.content.length, 0) / activePrompts.length
      : 0;
    const promptDepth = Math.min(100, Math.round((avgChars / 2500) * 100));
    if (avgChars < 1500) issues.push(`Profundidade média baixa (${Math.round(avgChars)} chars, ideal: 2500+)`);

    // 3. Axis coverage
    const { data: questions } = await supabase
      .from('questions')
      .select('axes, options, option_scores')
      .eq('test_id', currentModule.id);

    const allAxes = new Set<string>();
    let brokenQuestions = 0;
    (questions || []).forEach((q: any) => {
      (q.axes || []).forEach((a: string) => allAxes.add(a));
      if (!q.options || q.options.length === 0) brokenQuestions++;
      if (!q.option_scores || q.option_scores.length === 0) brokenQuestions++;
    });

    const promptText = activePrompts.map(p => p.content.toLowerCase()).join(' ');
    const coveredAxes = Array.from(allAxes).filter(a => promptText.includes(a.toLowerCase()));
    const axisCoverage = allAxes.size > 0 ? Math.round((coveredAxes.length / allAxes.size) * 100) : 0;
    if (axisCoverage < 80) issues.push(`${allAxes.size - coveredAxes.length} eixo(s) não mencionado(s) nos prompts`);

    // 4. Question health
    const qCount = questionCounts[currentModule.id] || 0;
    const questionHealth = Math.min(100, Math.round((qCount / 36) * 100));
    if (qCount < 20) issues.push(`Apenas ${qCount} perguntas (mínimo recomendado: 36)`);
    if (brokenQuestions > 0) issues.push(`${brokenQuestions} pergunta(s) sem opções ou scores`);

    // 5. Config checks
    const hasAiConfig = testAiConfigs.some(c => c.test_id === currentModule.id);
    if (!hasAiConfig) issues.push('Sem configuração de IA específica');

    const { data: template } = await supabase
      .from('report_templates')
      .select('id, sections, output_rules')
      .eq('test_id', currentModule.id)
      .maybeSingle();

    const hasTemplate = !!(template && (template.sections as any[])?.length > 0);
    const rules = template?.output_rules as any;
    const hasOutputRules = !!(rules && rules.forbiddenLanguage?.length > 0);
    if (!hasTemplate) issues.push('Sem template de relatório');
    if (!hasOutputRules) issues.push('Sem regras de saída configuradas');

    // Overall weighted score
    const overallScore = Math.round(
      promptCoverage * 0.25 +
      promptDepth * 0.20 +
      axisCoverage * 0.15 +
      questionHealth * 0.20 +
      (hasAiConfig ? 100 : 0) * 0.05 +
      (hasTemplate ? 100 : 0) * 0.10 +
      (hasOutputRules ? 100 : 0) * 0.05
    );

    setMetrics({ promptCoverage, promptDepth, axisCoverage, questionCount: qCount, questionHealth, hasAiConfig, hasTemplate, hasOutputRules, overallScore, issues });
  };

  if (!metrics) return null;

  const scoreColor = metrics.overallScore >= 80 ? 'emerald' : metrics.overallScore >= 50 ? 'amber' : 'red';
  const ScoreIcon = metrics.overallScore >= 80 ? CheckCircle2 : metrics.overallScore >= 50 ? AlertTriangle : XCircle;

  const bars = [
    { label: 'Prompts', value: metrics.promptCoverage, icon: FileText },
    { label: 'Profundidade', value: metrics.promptDepth, icon: Layers },
    { label: 'Eixos', value: metrics.axisCoverage, icon: BarChart3 },
    { label: 'Perguntas', value: metrics.questionHealth, icon: HelpCircle },
    { label: 'Config', value: (metrics.hasAiConfig ? 50 : 0) + (metrics.hasTemplate ? 30 : 0) + (metrics.hasOutputRules ? 20 : 0), icon: Settings },
  ];

  return (
    <div className={`rounded-2xl border p-4 space-y-3 bg-${scoreColor}-500/[0.02] border-${scoreColor}-500/20`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl bg-${scoreColor}-500/10 flex items-center justify-center`}>
            <Activity className={`w-5 h-5 text-${scoreColor}-500`} />
          </div>
          <div>
            <h3 className="text-[0.85rem] font-bold">Health Score do Módulo</h3>
            <p className="text-[0.68rem] text-muted-foreground/50">{currentModule.name}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-${scoreColor}-500/10 border border-${scoreColor}-500/20`}>
          <ScoreIcon className={`w-5 h-5 text-${scoreColor}-600`} />
          <span className={`text-xl font-black text-${scoreColor}-600`}>{metrics.overallScore}</span>
          <span className={`text-[0.65rem] text-${scoreColor}-600/60`}>/100</span>
        </div>
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-5 gap-2">
        {bars.map(bar => {
          const BarIcon = bar.icon;
          const color = bar.value >= 80 ? 'bg-emerald-500' : bar.value >= 50 ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div key={bar.label} className="space-y-1">
              <div className="flex items-center gap-1">
                <BarIcon className="w-3 h-3 text-muted-foreground/40" />
                <span className="text-[0.6rem] font-medium text-muted-foreground/60">{bar.label}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${bar.value}%` }} />
              </div>
              <span className="text-[0.55rem] font-mono text-muted-foreground/40">{bar.value}%</span>
            </div>
          );
        })}
      </div>

      {/* Issues */}
      {metrics.issues.length > 0 && (
        <div className="space-y-1 pt-1">
          {metrics.issues.slice(0, 4).map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[0.65rem] text-muted-foreground/60">
              <span className="text-amber-500 shrink-0">•</span>
              {issue}
            </div>
          ))}
          {metrics.issues.length > 4 && (
            <span className="text-[0.6rem] text-muted-foreground/40">+{metrics.issues.length - 4} outros problemas</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuleHealthScore;
