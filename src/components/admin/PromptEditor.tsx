import { Save, ToggleRight, ToggleLeft, Plus, Lightbulb, AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PROMPT_SECTIONS, PROMPT_TEMPLATES, type TestPrompt, type TestModule } from './promptConstants';
import { toast } from 'sonner';

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

const PromptEditor = ({
  currentModule, testPrompts, editedTexts, setEditedTexts,
  saving, onSavePrompt, onTogglePrompt, onCreatePrompt,
}: PromptEditorProps) => {
  const currentPrompts = testPrompts.filter(p => p.test_id === currentModule.id);
  const byType: Record<string, TestPrompt> = {};
  currentPrompts.forEach(p => { byType[p.prompt_type] = p; });

  const applyTemplate = (promptId: string, sectionType: string) => {
    const template = PROMPT_TEMPLATES[sectionType];
    if (!template) { toast.info('Nenhum template disponível para esta seção'); return; }
    setEditedTexts(prev => ({ ...prev, [`tp_${promptId}`]: template }));
    toast.success('Template aplicado — edite conforme necessário');
  };

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{currentModule.name}</h2>
          <span className="text-[0.65rem] font-mono text-muted-foreground/40">{currentModule.slug}</span>
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
                {isEmpty && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" title="Prompt ativo mas vazio!" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {PROMPT_SECTIONS.map(section => {
          const prompt = byType[section.type];
          const SIcon = section.icon;
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
                  {prompt ? (
                    <div className={`space-y-4 ${!prompt.is_active ? 'opacity-40' : ''}`}>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[0.65rem] text-muted-foreground/30">
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
                        </div>
                        <button
                          onClick={() => onSavePrompt(prompt)}
                          disabled={(editedTexts[`tp_${prompt.id}`] ?? prompt.content) === prompt.content || saving === prompt.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[0.75rem] font-semibold disabled:opacity-20 hover:opacity-90 transition-all"
                        >
                          <Save className="w-3.5 h-3.5" /> {saving === prompt.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : (
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
