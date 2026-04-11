import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Questionnaire from '@/components/diagnostic/Questionnaire';
import AnalyzingScreen from '@/components/diagnostic/AnalyzingScreen';
import Report from '@/components/diagnostic/Report';
import { Answer, DiagnosticResult, PatternScore } from '@/types/diagnostic';
import { analyzeAnswers } from '@/lib/analysis';
import { analyzePurposeAnswers } from '@/lib/purposeAnalysis';
import { analyzeGenericTest } from '@/lib/genericAnalysis';
import { getTestEngine } from '@/lib/testEngineRegistry';
import { updateCentralProfile } from '@/lib/centralProfile';
import { assembleReport } from '@/lib/reportAssembler';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createActionPlanTracking } from '@/hooks/useActionPlan';
import { trackEvent } from '@/lib/trackEvent';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { UserCircle, ChevronRight } from 'lucide-react';
// import { canAccessModule, getMonthlyTestLimit, getCurrentMonthYear } from '@/lib/planLimits';

type Step = 'loading' | 'select-person' | 'questionnaire' | 'analyzing' | 'report';

const PURPOSE_SLUG = 'proposito-sentido';
const BEHAVIORAL_SLUG = 'padrao-comportamental';

interface DbQuestion {
  id: number;
  text: string;
  axes: string[];
  type?: string;
  options?: string[] | null;
  option_scores?: number[] | null;
  context?: string | null;
}

interface ManagedPerson {
  id: string;
  name: string;
  cpf: string;
}

/**
 * Calculate raw scores from answers using question axes.
 * This is pure math — no interpretation.
 */
function calculateRawScores(answers: Answer[], questions: DbQuestion[], axisKeys: string[]): PatternScore[] {
  const rawScores: Record<string, number> = {};
  const maxScores: Record<string, number> = {};
  axisKeys.forEach(k => { rawScores[k] = 0; maxScores[k] = 0; });

  answers.forEach(answer => {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) return;

    let scoreValue: number;
    let maxPerQuestion: number;

    if (question.option_scores && question.option_scores.length > 0) {
      // Map answer index (1-based) to the actual score from option_scores
      const idx = Math.max(0, Math.min(answer.value - 1, question.option_scores.length - 1));
      scoreValue = question.option_scores[idx];
      maxPerQuestion = Math.max(...question.option_scores);
    } else if (question.type === 'intensity') {
      scoreValue = answer.value;
      maxPerQuestion = 10;
    } else {
      // Likert 1-5 → normalize to 0-4
      scoreValue = Math.max(0, answer.value - 1);
      maxPerQuestion = 4;
    }

    question.axes.forEach(axis => {
      if (axis in rawScores) {
        rawScores[axis] += scoreValue;
        maxScores[axis] += maxPerQuestion;
      }
    });
  });

  // Label map for known axes
  const AXIS_LABELS: Record<string, string> = {
    emocional: 'Emocional', espiritual: 'Espiritual', profissional: 'Profissional',
    financeiro: 'Financeiro', intelectual: 'Intelectual', saude: 'Saúde',
    social: 'Social', familia: 'Família', relacionamento: 'Relacionamento',
    filhos: 'Filhos', proposito: 'Propósito',
  };

  return axisKeys.map(key => ({
    key: key as any,
    label: AXIS_LABELS[key] || key,
    score: rawScores[key],
    maxScore: maxScores[key],
    percentage: maxScores[key] > 0 ? Math.min(100, Math.round((rawScores[key] / maxScores[key]) * 100)) : 0,
  })).sort((a, b) => b.percentage - a.percentage);
}

const Diagnostic = () => {
  const [step, setStep] = useState<Step>('loading');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [dbQuestions, setDbQuestions] = useState<DbQuestion[]>([]);
  const [persons, setPersons] = useState<ManagedPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const { user, isPremium, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { moduleSlug } = useParams();

  const slug = moduleSlug || BEHAVIORAL_SLUG;
  const isFreeTest = slug === BEHAVIORAL_SLUG;
  const canAccessTest = isSuperAdmin || isPremium || isFreeTest;

  useEffect(() => {
    if (!canAccessTest) {
      toast.error('Este teste requer um plano pago');
      navigate('/tests');
    }
  }, [canAccessTest, navigate]);

  useEffect(() => {
    const fetchModuleAndQuestions = async () => {
      const { data: mod } = await supabase
        .from('test_modules')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!mod) {
        toast.error('Diagnóstico não encontrado');
        navigate('/tests');
        return;
      }

      setModuleId(mod.id);

      const { data: questions, error } = await supabase
        .from('questions')
        .select('sort_order, text, axes, type, options, option_scores, context')
        .eq('test_id', mod.id)
        .order('sort_order', { ascending: true });

      if (error || !questions || questions.length === 0) {
        if (isSuperAdmin) {
          toast.error('Este diagnóstico ainda não possui estrutura completa de perguntas');
        } else {
          toast.error('Diagnóstico indisponível no momento');
        }
        navigate('/tests');
        return;
      }

      const MIN_QUESTIONS = 10;
      if (questions.length < MIN_QUESTIONS) {
        if (isSuperAdmin) {
          toast.error(`Este diagnóstico possui apenas ${questions.length} perguntas (mínimo: ${MIN_QUESTIONS}).`);
        } else {
          toast.error('Diagnóstico indisponível no momento');
        }
        navigate('/tests');
        return;
      }

      const missingAxes = questions.filter(q => !q.axes || q.axes.length === 0);
      if (missingAxes.length > questions.length * 0.5) {
        if (isSuperAdmin) {
          toast.error(`Mais de 50% das perguntas sem eixos configurados.`);
        } else {
          toast.error('Diagnóstico indisponível no momento');
        }
        navigate('/tests');
        return;
      }

      const validationErrors: string[] = [];
      questions.forEach((q, i) => {
        const order = q.sort_order || i + 1;
        const type = q.type || 'likert';
        // Only likert questions must be statements (not end with ?)
        if (type === 'likert' && q.text.trim().endsWith('?')) {
          validationErrors.push(`Pergunta ${order}: pergunta Likert deve ser afirmação, não pergunta`);
        }
        // Behavior choice questions must have options
        if (type === 'behavior_choice' && (!q.options || q.options.length < 2)) {
          validationErrors.push(`Pergunta ${order}: escolha comportamental sem opções configuradas`);
        }
      });

      if (validationErrors.length > 0) {
        console.warn(`[Diagnostic] Validation errors in "${slug}":`, validationErrors);
        if (isSuperAdmin) {
          toast.error(`${validationErrors.length} incompatibilidade(s). Verifique o console.`);
        }
      }

      setDbQuestions(questions.map((q, i) => ({
        id: q.sort_order || i + 1,
        text: q.text,
        axes: q.axes || [],
        type: q.type || 'likert',
        options: q.options,
        option_scores: q.option_scores,
        context: q.context || null,
      })));

      // Fetch managed persons for person selection
      let { data: personData } = await supabase
        .from('managed_persons')
        .select('id, name, cpf')
        .eq('owner_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      let fetchedPersons = (personData || []) as ManagedPerson[];

      // If no managed person exists, auto-create one from the user's profile
      if (fetchedPersons.length === 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, cpf, birth_date')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (profileData?.name) {
          const { data: newPerson } = await supabase
            .from('managed_persons')
            .insert({
              owner_id: user!.id,
              name: profileData.name,
              cpf: profileData.cpf || '00000000000',
              birth_date: profileData.birth_date || '2000-01-01',
            })
            .select('id, name, cpf')
            .single();

          if (newPerson) {
            fetchedPersons = [newPerson as ManagedPerson];
          }
        }
      }

      setPersons(fetchedPersons);

      if (fetchedPersons.length <= 1) {
        // Auto-select if only one person
        setSelectedPersonId(fetchedPersons[0]?.id || null);
        setStep('questionnaire');
      } else {
        setStep('select-person');
      }
    };

    fetchModuleAndQuestions();
  }, [slug, navigate, isSuperAdmin, user]);

  const saveToDatabase = useCallback(async (answers: Answer[], analysisResult: DiagnosticResult) => {
    if (!user) return;
    try {
      const sessionInsert: any = { user_id: user.id };
      if (moduleId) sessionInsert.test_module_id = moduleId;
      if (selectedPersonId) sessionInsert.person_id = selectedPersonId;

      const { data: session, error: sessionError } = await supabase
        .from('diagnostic_sessions')
        .insert(sessionInsert)
        .select()
        .single();

      if (sessionError || !session) throw sessionError;

      const answerRows = answers.map(a => ({
        session_id: session.id,
        question_id: a.questionId,
        answer_value: a.value,
      }));

      await supabase.from('diagnostic_answers').insert(answerRows);

      await supabase.from('diagnostic_results').insert([{
        session_id: session.id,
        dominant_pattern: analysisResult.dominantPattern.key,
        secondary_patterns: analysisResult.secondaryPatterns.map(p => p.key),
        intensity: analysisResult.intensity,
        profile_name: analysisResult.profileName,
        mental_state: analysisResult.mentalState,
        state_summary: analysisResult.summary,
        mechanism: analysisResult.mechanism,
        triggers: analysisResult.triggers,
        traps: analysisResult.mentalTraps,
        self_sabotage_cycle: analysisResult.selfSabotageCycle,
        blocking_point: analysisResult.blockingPoint,
        contradiction: analysisResult.contradiction,
        life_impact: JSON.parse(JSON.stringify(analysisResult.lifeImpact)),
        exit_strategy: JSON.parse(JSON.stringify(analysisResult.exitStrategy)),
        all_scores: JSON.parse(JSON.stringify(analysisResult.allScores)),
        direction: analysisResult.direction,
        combined_title: analysisResult.combinedTitle,
        core_pain: analysisResult.corePain || '',
        key_unlock_area: analysisResult.keyUnlockArea || '',
        critical_diagnosis: analysisResult.criticalDiagnosis || '',
        impact: analysisResult.impact || '',
        what_not_to_do: analysisResult.whatNotToDo || [],
      }]);

      // Get the saved result ID
      const { data: savedResult } = await supabase
        .from('diagnostic_results')
        .select('id')
        .eq('session_id', session.id)
        .maybeSingle();

      await supabase
        .from('diagnostic_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', session.id);

      await updateCentralProfile(user.id);

      // Create action plan tracking (non-blocking)
      if (savedResult?.id) {
        try {
          const ai = analysisResult as any;
          const actions: string[] = [];
          // Collect microAcoes
          if (Array.isArray(ai.microAcoes)) {
            ai.microAcoes.forEach((a: any) => {
              if (typeof a === 'string') actions.push(a);
              else if (a?.acao) actions.push(a.acao);
            });
          }
          // Collect exitStrategy
          if (Array.isArray(analysisResult.exitStrategy)) {
            analysisResult.exitStrategy.forEach((s: any) => {
              const text = s.action || s.title || '';
              if (text && !actions.includes(text)) actions.push(text);
            });
          }
          // Collect whatNotToDo as inverted actions
          if (Array.isArray(analysisResult.whatNotToDo)) {
            analysisResult.whatNotToDo.forEach((w: string) => {
              if (w && !actions.includes(w)) actions.push(w);
            });
          }
          if (actions.length > 0) {
            await createActionPlanTracking(user.id, savedResult.id, actions);
            trackEvent({ userId: user.id, event: 'action_plan_created', moduleId: moduleId || undefined, diagnosticResultId: savedResult.id, metadata: { totalActions: actions.length } });
          }
        } catch (e) {
          console.error('Action plan creation failed (non-blocking):', e);
        }
      }

      // Send report-ready email (non-blocking)
      try {
        const userEmail = user.email;
        if (userEmail) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', user.id)
            .maybeSingle();

          await supabase.functions.invoke('send-email', {
            body: {
              templateName: 'report-ready',
              to: userEmail,
              data: {
                name: profileData?.name || userEmail.split('@')[0],
                reportName: 'Perfil Central',
                reportUrl: `${window.location.origin}/central-report`,
              },
            },
          });
        }
      } catch (e) {
        console.error('Report-ready email failed (non-blocking):', e);
      }
    } catch (err) {
      console.error('Error saving diagnostic:', err);
      toast.error('Erro ao salvar diagnóstico, mas seu resultado está disponível.');
    }
  }, [user, moduleId, selectedPersonId]);

  /**
   * Local fallback analysis (hardcoded patterns).
   * Used when AI prompts aren't configured or AI call fails.
   */
  const runLocalAnalysis = useCallback((answers: Answer[]): DiagnosticResult => {
    if (slug === PURPOSE_SLUG) {
      const r = analyzePurposeAnswers(answers);
      return {
        dominantPattern: { ...r.dominantPattern, key: r.dominantPattern.key as any },
        secondaryPatterns: r.secondaryPatterns.map(p => ({ ...p, key: p.key as any })),
        intensity: r.intensity,
        allScores: r.allScores as any,
        summary: r.summary,
        mechanism: r.mechanism,
        contradiction: r.contradiction,
        impact: r.impact,
        direction: r.direction,
        combinedTitle: r.combinedTitle,
        profileName: r.profileName,
        mentalState: r.mentalState,
        triggers: r.triggers,
        mentalTraps: r.mentalTraps,
        selfSabotageCycle: r.selfSabotageCycle,
        blockingPoint: r.blockingPoint,
        lifeImpact: r.lifeImpact,
        exitStrategy: r.exitStrategy,
        corePain: r.corePain,
        keyUnlockArea: r.keyUnlockArea,
        criticalDiagnosis: r.criticalDiagnosis,
        whatNotToDo: r.whatNotToDo,
      };
    }

    const engine = getTestEngine(slug);
    if (engine) {
      return analyzeGenericTest(answers, dbQuestions, engine.axes, engine.definitions, slug);
    }

    // Fallback — should not happen since all modules are registered
    console.warn(`No engine found for slug "${slug}", falling back to legacy analysis`);
    return analyzeAnswers(answers);
  }, [slug, dbQuestions]);

  /**
   * Try AI-powered analysis using admin-configured prompts.
   * Returns null if AI is unavailable or fails.
   */
  const runAIAnalysis = useCallback(async (answers: Answer[]): Promise<DiagnosticResult | null> => {
    if (!moduleId) return null;

    try {
      // Calculate raw scores to send to the AI
      const allAxes = new Set<string>();
      dbQuestions.forEach(q => q.axes.forEach(a => allAxes.add(a)));
      const axisKeys = Array.from(allAxes);

      // Get labels from engine if available
      const engine = getTestEngine(slug);
      const scores = calculateRawScores(answers, dbQuestions, axisKeys).map(s => ({
        ...s,
        label: engine?.definitions[s.key]?.label || s.label,
      }));

      // Build structured answer data with question context + mapped scores
      const LIKERT_LABELS: Record<number, string> = {
        1: 'Discordo totalmente',
        2: 'Discordo',
        3: 'Neutro',
        4: 'Concordo',
        5: 'Concordo totalmente',
      };

      const structuredAnswers = answers.map(a => {
        const q = dbQuestions.find(dq => dq.id === a.questionId);
        if (!q) return null;
        
        // Determine the chosen option label
        let chosenOption: string | null = null;
        if (q.options && q.options[a.value - 1]) {
          chosenOption = q.options[a.value - 1];
        } else if ((q.type || 'likert') === 'likert') {
          chosenOption = LIKERT_LABELS[a.value] || `Valor ${a.value}`;
        }

        // Calculate the mapped score (0-100) for this answer
        let mappedScore: number;
        if (q.option_scores && q.option_scores.length > 0) {
          const idx = Math.max(0, Math.min(a.value - 1, q.option_scores.length - 1));
          const maxOption = Math.max(...q.option_scores);
          mappedScore = maxOption > 0 ? Math.round((q.option_scores[idx] / maxOption) * 100) : 0;
        } else if (q.type === 'intensity') {
          mappedScore = Math.round((a.value / 10) * 100);
        } else {
          // Likert 1-5 → 0-100
          mappedScore = Math.round(((a.value - 1) / 4) * 100);
        }

        return {
          questionId: a.questionId,
          questionText: q.text,
          questionType: q.type || 'likert',
          axes: q.axes,
          value: a.value,
          mappedScore,
          chosenOption,
        };
      }).filter(Boolean);

      const { data, error } = await supabase.functions.invoke('analyze-test', {
        body: { test_module_id: moduleId, scores, slug, answers: structuredAnswers },
      });

      if (error) {
        console.warn('[AI Analysis] Edge function error:', error);
        return null;
      }

      // Check if AI told us to use fallback
      if (data?.useFallback) {
        console.log('[AI Analysis] No prompts configured, using local fallback');
        return null;
      }

      if (data?.error) {
        console.warn('[AI Analysis] Error:', data.error);
        if (data.error.includes('Limite') || data.error.includes('429')) {
          toast.error('Análise IA temporariamente indisponível. Usando análise local.');
        }
        return null;
      }

      const ai = data?.analysis;
      if (!ai) return null;

      // Build DiagnosticResult from AI response
      const dominant = scores[0];
      const secondary = scores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 2);
      const intensity = dominant.percentage >= 75 ? 'alto' : dominant.percentage >= 50 ? 'moderado' : 'leve';

      const dominantPattern = {
        key: dominant.key as any,
        label: dominant.label,
        description: ai.summary || '',
        mechanism: ai.mechanism || '',
        contradiction: ai.contradiction || '',
        impact: ai.impact || '',
        direction: ai.direction || '',
        profileName: ai.profileName || '',
        mentalState: ai.mentalState || '',
        triggers: ai.triggers || [],
        mentalTraps: ai.mentalTraps || [],
        selfSabotageCycle: ai.selfSabotageCycle || [],
        blockingPoint: ai.blockingPoint || '',
        lifeImpact: ai.lifeImpact || [],
        exitStrategy: ai.exitStrategy || [],
        corePain: ai.corePain || '',
        keyUnlockArea: ai.keyUnlockArea || '',
        criticalDiagnosis: ai.criticalDiagnosis || '',
        whatNotToDo: ai.whatNotToDo || [],
      };

      const resultObj: any = {
        dominantPattern,
        secondaryPatterns: secondary.map(s => ({
          ...dominantPattern,
          key: s.key as any,
          label: s.label,
        })),
        intensity: intensity as any,
        allScores: scores,
        summary: ai.summary || ai.resumoPrincipal || '',
        mechanism: ai.mechanism || ai.padraoIdentificado || '',
        contradiction: ai.contradiction || '',
        impact: ai.impact || '',
        direction: ai.direction || ai.direcaoAjuste || '',
        combinedTitle: ai.combinedTitle || dominant.label,
        profileName: ai.profileName || '',
        mentalState: ai.mentalState || ai.comoAparece || '',
        triggers: ai.triggers || ai.gatilhos || [],
        mentalTraps: ai.mentalTraps || [],
        selfSabotageCycle: ai.selfSabotageCycle || [],
        blockingPoint: ai.blockingPoint || '',
        lifeImpact: ai.lifeImpact || [],
        exitStrategy: ai.exitStrategy || [],
        corePain: ai.corePain || ai.significadoPratico || '',
        keyUnlockArea: ai.keyUnlockArea || ai.direcaoAjuste || '',
        criticalDiagnosis: ai.criticalDiagnosis || ai.resumoPrincipal || '',
        whatNotToDo: ai.whatNotToDo || ai.oQueEvitar || [],
        // New 8-section template fields
        chamaAtencao: ai.chamaAtencao || ai.resumoPrincipal || '',
        padraoRepetido: ai.padraoRepetido || ai.padraoIdentificado || '',
        comoAparece: ai.comoAparece || '',
        gatilhos: ai.gatilhos || [],
        comoAtrapalha: ai.comoAtrapalha || ai.significadoPratico || '',
        impactoPorArea: ai.impactoPorArea || [],
        corrigirPrimeiro: ai.corrigirPrimeiro || ai.direcaoAjuste || '',
        pararDeFazer: ai.pararDeFazer || ai.oQueEvitar || [],
        acaoInicial: ai.acaoInicial || ai.proximoPasso || ai.firstAction || '',
        // New structured fields
        microAcoes: ai.microAcoes || [],
        mentalCommand: ai.mentalCommand || '',
        mecanismoNeural: ai.mecanismoNeural || null,
        focoMudanca: ai.focoMudanca || '',
        // Legacy fields for backward compat
        resumoPrincipal: ai.resumoPrincipal || ai.chamaAtencao || '',
        significadoPratico: ai.significadoPratico || ai.comoAtrapalha || '',
        padraoIdentificado: ai.padraoIdentificado || ai.padraoRepetido || '',
        impactoVida: ai.impactoVida || [],
        direcaoAjuste: ai.direcaoAjuste || ai.corrigirPrimeiro || '',
        oQueEvitar: ai.oQueEvitar || ai.pararDeFazer || [],
        proximoPasso: ai.proximoPasso || ai.acaoInicial || ai.firstAction || '',
      };

      return resultObj as DiagnosticResult;
    } catch (err) {
      console.warn('[AI Analysis] Unexpected error:', err);
      return null;
    }
  }, [moduleId, slug, dbQuestions]);

  const handleComplete = useCallback(async (answers: Answer[]) => {
    setStep('analyzing');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Try AI-powered analysis first, fall back to local
    let analysisResult = await runAIAnalysis(answers);
    
    if (!analysisResult) {
      console.log('[Diagnostic] Using local analysis fallback');
      analysisResult = runLocalAnalysis(answers);
    } else {
      console.log('[Diagnostic] Using AI-powered analysis from admin prompts');
      // Apply structured block assembly + quality validation to AI output
      analysisResult = assembleReport(analysisResult);
    }

    setResult(analysisResult);
    setStep('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    saveToDatabase(answers, analysisResult);
  }, [saveToDatabase, runAIAnalysis, runLocalAnalysis]);

  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {step === 'loading' && (
          <div key="loading" className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm tracking-wide">Carregando perguntas...</div>
          </div>
        )}
        {step === 'select-person' && (
          <motion.div
            key="select-person"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="w-full max-w-md space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-serif">Para quem é esta leitura?</h2>
                <p className="text-sm text-muted-foreground">Selecione a pessoa que fará o teste</p>
              </div>
              <div className="space-y-3">
                {persons.map(person => (
                  <button
                    key={person.id}
                    onClick={() => {
                      setSelectedPersonId(person.id);
                      setStep('questionnaire');
                    }}
                    className="w-full flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{person.name}</p>
                      <p className="text-xs text-muted-foreground">CPF: {person.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {step === 'questionnaire' && dbQuestions.length > 0 && (
          <Questionnaire
            key="q"
            onComplete={handleComplete}
            questions={dbQuestions}
          />
        )}
        {step === 'analyzing' && <AnalyzingScreen key="a" />}
        {step === 'report' && result && <Report key="r" result={result} onRestart={handleGoToDashboard} moduleSlug={slug} />}
      </AnimatePresence>
    </div>
  );
};

export default Diagnostic;
