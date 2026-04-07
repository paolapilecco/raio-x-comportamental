import { useState } from 'react';
import { Save, ToggleRight, ToggleLeft, Plus, Lightbulb, AlertCircle, Sparkles, Loader2, RefreshCw, Check, X, Pencil, BookmarkPlus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PROMPT_SECTIONS, PROMPT_TEMPLATES, type TestPrompt, type TestModule } from './promptConstants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PromptEditorProps {
  currentModule: TestModule;
  testPrompts: TestPrompt[];
  editedTexts: Record<string, string>;
  setEditedTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  onSavePrompt: (prompt: TestPrompt) => Promise<void>;
  onTogglePrompt: (prompt: TestPrompt) => Promise<void>;
  onCreatePrompt: (testId: string, section: typeof PROMPT_SECTIONS[0]) => Promise<void>;
}

interface AIPreview {
  promptId: string;
  sectionType: string;
  content: string;
  editing: boolean;
}

const PromptEditor = ({
  currentModule, testPrompts, editedTexts, setEditedTexts,
  saving, onSavePrompt, onTogglePrompt, onCreatePrompt,
}: PromptEditorProps) => {
  const { user } = useAuth();
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<AIPreview | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const currentPrompts = testPrompts.filter(p => p.test_id === currentModule.id);
  const byType: Record<string, TestPrompt> = {};
  currentPrompts.forEach(p => { byType[p.prompt_type] = p; });

  const logGeneration = async (sectionType: string, content: string, action: string) => {
    try {
      await supabase.from('prompt_generation_history' as any).insert({
        test_id: currentModule.id,
        section_type: sectionType,
        generated_content: content,
        action,
        generated_by: user?.id || null,
      });
    } catch (e) {
      console.error('Failed to log generation:', e);
    }
  };

  const applyTemplate = (promptId: string, sectionType: string) => {
    const template = PROMPT_TEMPLATES[sectionType];
    if (!template) { toast.info('Nenhum template disponível para esta seção'); return; }
    setEditedTexts(prev => ({ ...prev, [`tp_${promptId}`]: template }));
    toast.success('Template aplicado — edite conforme necessário');
  };

  const callAI = async (sectionType: string): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke('generate-prompt', {
      body: { testId: currentModule.id, sectionType },
    });
    if (error) throw error;
    if (data?.error) { toast.error(data.error); return null; }
    return data?.prompt || null;
  };

  const generateWithAI = async (promptId: string, sectionType: string) => {
    setGeneratingAI(sectionType);
    try {
      const prompt = await callAI(sectionType);
      if (prompt) {
        setAiPreview({ promptId, sectionType, content: prompt, editing: false });
        await logGeneration(sectionType, prompt, 'generated');
      }
    } catch (e: any) {
      console.error('AI prompt generation error:', e);
      toast.error('Erro ao gerar prompt com IA');
    } finally {
      setGeneratingAI(null);
    }
  };

  const regenerateAI = async () => {
    if (!aiPreview) return;
    setGeneratingAI(aiPreview.sectionType);
    try {
      const prompt = await callAI(aiPreview.sectionType);
      if (prompt) {
        setAiPreview(prev => prev ? { ...prev, content: prompt, editing: false } : null);
        await logGeneration(aiPreview.sectionType, prompt, 'regenerated');
        toast.success('Nova versão gerada');
      }
    } catch (e: any) {
      console.error('AI regeneration error:', e);
      toast.error('Erro ao regenerar prompt');
    } finally {
      setGeneratingAI(null);
    }
  };

  const acceptAIPrompt = async () => {
    if (!aiPreview) return;
    setEditedTexts(prev => ({ ...prev, [`tp_${aiPreview.promptId}`]: aiPreview.content }));
    await logGeneration(aiPreview.sectionType, aiPreview.content, 'accepted');
    setAiPreview(null);
    toast.success('Prompt aceito — revise e salve quando quiser');
  };

  const saveAsTemplate = async () => {
    if (!aiPreview) return;
    setSavingTemplate(true);
    try {
      // Update the PROMPT_TEMPLATES in the report_templates table output_rules
      const { data: existing } = await supabase
        .from('report_templates')
        .select('id, output_rules')
        .eq('test_id', currentModule.id)
        .maybeSingle();

      const currentRules = (existing?.output_rules as any) || {};
      const updatedRules = {
        ...currentRules,
        promptTemplates: {
          ...(currentRules.promptTemplates || {}),
          [aiPreview.sectionType]: aiPreview.content,
        },
      };

      if (existing) {
        await supabase.from('report_templates').update({ output_rules: updatedRules }).eq('id', existing.id);
      } else {
        await supabase.from('report_templates').insert({ test_id: currentModule.id, output_rules: updatedRules, sections: [] });
      }

      await logGeneration(aiPreview.sectionType, aiPreview.content, 'saved_as_template');
      toast.success(`Salvo como template base de "${PROMPT_SECTIONS.find(s => s.type === aiPreview.sectionType)?.label}"`);
    } catch (e) {
      console.error('Save template error:', e);
      toast.error('Erro ao salvar como template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const discardAIPrompt = () => {
    setAiPreview(null);
  };

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold truncate">{currentModule.name}</h2>
          <span className="text-[0.65rem] font-mono text-muted-foreground/40 hidden sm:inline">{currentModule.slug}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {PROMPT_SECTIONS.map(s => {
            const exists = !!byType[s.type];
            const SIcon = s.icon;
            return (
              <div key={s.type} title={`${s.label}: ${exists ? 'Configurado' : 'Pendente'}`}
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${exists ? s.bgColor : 'bg-muted/20'}`}>
                <SIcon className={`w-3 h-3 ${exists ? s.color : 'text-muted-foreground/25'}`} />
              </div>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="interpretation" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/30 p-1.5 rounded-xl">
          {PROMPT_SECTIONS.map(s => {
            const exists = !!byType[s.type];
            const prompt = byType[s.type];
            const isEmpty = exists && prompt.is_active && !(editedTexts[`tp_${prompt.id}`] ?? prompt.content).trim();
            const SIcon = s.icon;
            return (
              <TabsTrigger key={s.type} value={s.type} className="flex items-center gap-1.5 text-[0.72rem] px-3 py-2 data-[state=active]:shadow-sm">
                <SIcon className={`w-3 h-3 ${exists ? s.color : 'text-muted-foreground/40'}`} />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.shortLabel}</span>
                {!exists && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                {isEmpty && <span className="relative flex h-3 w-3" title="Prompt ativo mas vazio!"><AlertCircle className="w-3 h-3 text-red-500 animate-pulse" /></span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {PROMPT_SECTIONS.map(section => {
          const prompt = byType[section.type];
          const SIcon = section.icon;
          const showPreview = aiPreview && aiPreview.sectionType === section.type;
          return (
            <TabsContent key={section.type} value={section.type} className="mt-4">
              <div className={`rounded-2xl border ${section.borderColor} overflow-hidden`}>
                {/* Section header */}
                <div className={`flex items-center gap-3 px-5 py-4 ${section.bgColor}`}>
                  <SIcon className={`w-5 h-5 ${section.color}`} />
                  <div className="flex-1">
                    <h3 className="text-[0.9rem] font-semibold">{section.label}</h3>
                    <p className="text-[0.7rem] text-muted-foreground/60 mt-0.5">{section.description}</p>
                  </div>
                  {prompt && (
                    <button onClick={() => onTogglePrompt(prompt)} className="p-1.5 hover:bg-background/30 rounded-lg transition-colors" title={prompt.is_active ? 'Desativar' : 'Ativar'}>
                      {prompt.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* AI Preview Modal */}
                  {showPreview && (
                    <div className="mb-4 rounded-xl border-2 border-primary/30 bg-primary/[0.03] overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 border-b border-primary/20">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-[0.8rem] font-semibold text-primary">Pré-visualização — Prompt gerado pela IA</span>
                        <div className="flex-1" />
                        {aiPreview.editing ? (
                          <span className="text-[0.65rem] text-muted-foreground/60">Editando...</span>
                        ) : (
                          <button
                            onClick={() => setAiPreview(prev => prev ? { ...prev, editing: true } : null)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] font-medium text-muted-foreground hover:bg-background/50 transition-colors"
                            title="Editar antes de aceitar"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </button>
                        )}
                      </div>
                      <div className="p-4">
                        {aiPreview.editing ? (
                          <textarea
                            value={aiPreview.content}
                            onChange={(e) => setAiPreview(prev => prev ? { ...prev, content: e.target.value } : null)}
                            rows={Math.max(8, aiPreview.content.split('\n').length)}
                            className="w-full border rounded-xl p-4 text-[0.8rem] leading-[1.8] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono bg-background/50 border-border/20 text-foreground/80"
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap text-[0.78rem] leading-[1.8] text-foreground/70 font-mono max-h-[400px] overflow-y-auto">
                            {aiPreview.content}
                          </pre>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-4 py-3 bg-muted/20 border-t border-primary/10">
                        <button
                          onClick={acceptAIPrompt}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[0.75rem] font-semibold hover:opacity-90 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aceitar
                        </button>
                        <button
                          onClick={saveAsTemplate}
                          disabled={savingTemplate}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[0.75rem] font-semibold border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                          title="Salvar este prompt como template base para esta seção neste teste"
                        >
                          {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                          {savingTemplate ? 'Salvando...' : 'Salvar como template'}
                        </button>
                        <button
                          onClick={regenerateAI}
                          disabled={generatingAI === aiPreview.sectionType}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[0.75rem] font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                        >
                          {generatingAI === aiPreview.sectionType ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          {generatingAI === aiPreview.sectionType ? 'Regenerando...' : 'Regenerar'}
                        </button>
                        <button
                          onClick={discardAIPrompt}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[0.75rem] font-medium text-muted-foreground hover:bg-muted/30 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          Descartar
                        </button>
                      </div>
                    </div>
                  )}

                  {prompt ? (() => {
                    const currentContent = (editedTexts[`tp_${prompt.id}`] ?? prompt.content).trim();
                    const isEmptyAndActive = prompt.is_active && !currentContent;
                    return (
                    <div className={`space-y-4 ${!prompt.is_active ? 'opacity-40' : ''}`}>
                      {isEmptyAndActive && (
                        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/25 bg-red-500/[0.05]">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <div>
                            <p className="text-[0.78rem] font-semibold text-red-600 dark:text-red-400">Prompt vazio</p>
                            <p className="text-[0.68rem] text-red-500/60">Este prompt está ativo mas sem conteúdo. A IA não terá instruções para esta seção. Use o template sugerido ou escreva suas instruções.</p>
                          </div>
                        </div>
                      )}
                      <textarea
                        value={editedTexts[`tp_${prompt.id}`] ?? prompt.content}
                        onChange={(e) => setEditedTexts(prev => ({ ...prev, [`tp_${prompt.id}`]: e.target.value }))}
                        rows={section.rows}
                        placeholder={`Escreva o prompt de ${section.label.toLowerCase()} aqui...\n\nSeja específico. Evite generalidades.`}
                        className={`w-full border rounded-xl p-4 text-[0.8rem] leading-[1.8] resize-y focus:outline-none focus:ring-2 transition-all font-mono ${
                          section.type === 'restrictions'
                            ? 'bg-red-500/[0.02] border-red-500/15 text-red-900/70 dark:text-red-300/70 focus:ring-red-500/20 placeholder:text-red-400/30'
                            : 'bg-background/50 border-border/20 text-foreground/80 focus:ring-primary/20 placeholder:text-muted-foreground/30'
                        }`}
                      />
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="text-[0.6rem] sm:text-[0.65rem] text-muted-foreground/30">
                            Última edição: {new Date(prompt.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {PROMPT_TEMPLATES[section.type] && (
                            <button
                              onClick={() => applyTemplate(prompt.id, section.type)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.68rem] font-medium bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
                              title="Aplicar template sugerido como ponto de partida"
                            >
                              <Lightbulb className="w-3 h-3" />
                              Usar Template
                            </button>
                          )}
                          <button
                            onClick={() => generateWithAI(prompt.id, section.type)}
                            disabled={generatingAI === section.type}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.68rem] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                            title="Gerar prompt automaticamente com IA baseado no contexto do teste"
                          >
                            {generatingAI === section.type ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {generatingAI === section.type ? 'Gerando...' : 'Gerar com IA'}
                          </button>
                        </div>
                        <button
                          onClick={() => onSavePrompt(prompt)}
                          disabled={(editedTexts[`tp_${prompt.id}`] ?? prompt.content) === prompt.content || saving === prompt.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[0.75rem] font-semibold disabled:opacity-20 hover:opacity-90 transition-all w-full sm:w-auto justify-center"
                        >
                          <Save className="w-3.5 h-3.5" /> {saving === prompt.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <div className={`w-12 h-12 rounded-2xl ${section.bgColor} flex items-center justify-center`}>
                        <SIcon className={`w-6 h-6 ${section.color} opacity-40`} />
                      </div>
                      <p className="text-[0.85rem] font-medium text-muted-foreground/50">Prompt de {section.label} não configurado</p>
                      <p className="text-[0.7rem] text-muted-foreground/35 max-w-md text-center">{section.description}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onCreatePrompt(currentModule.id, section)}
                          disabled={saving === `create_${section.type}`}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.8rem] font-semibold transition-all ${section.bgColor} ${section.color} hover:opacity-80 disabled:opacity-30`}
                        >
                          <Plus className="w-4 h-4" />
                          {saving === `create_${section.type}` ? 'Criando...' : `Criar Prompt`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default PromptEditor;
