import { Save, ToggleRight, ToggleLeft, Cpu, Settings, Sliders, ChevronDown, ChevronRight } from 'lucide-react';
import { AI_MODELS, TONE_OPTIONS, STYLE_OPTIONS, DEPTH_LABELS, type GlobalAiConfig, type TestAiConfig, type TestModule } from './promptConstants';

interface AIConfigPanelProps {
  // Global
  globalAiConfig: GlobalAiConfig | null;
  editedGlobalAi: Partial<GlobalAiConfig>;
  setEditedGlobalAi: React.Dispatch<React.SetStateAction<Partial<GlobalAiConfig>>>;
  onSaveGlobalAi: () => Promise<void>;
  // Test-specific
  currentModule: TestModule | undefined;
  editedTai: Partial<TestAiConfig>;
  onUpdateTestAiField: (field: string, value: any) => void;
  onSaveTestAi: () => Promise<void>;
  // UI state
  saving: string | null;
  selectedModule: string;
  expandedGlobal: boolean;
  onToggleGlobal: () => void;
}

const ConfigFields = ({
  config, onChange, onSave, savingKey, saving, disabled,
}: {
  config: Partial<GlobalAiConfig | TestAiConfig>;
  onChange: (field: string, value: any) => void;
  onSave: () => void;
  savingKey: string;
  saving: string | null;
  disabled?: boolean;
}) => (
  <div className="space-y-4">
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
        <label className="text-[0.75rem] font-semibold text-foreground/80">IA Ativa</label>
        <button onClick={() => onChange('ai_enabled', !config.ai_enabled)} className="flex items-center gap-2">
          {config.ai_enabled ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
          <span className="text-[0.7rem] text-muted-foreground/60">{config.ai_enabled ? 'Ativada' : 'Desativada'}</span>
        </button>
      </div>
      <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
        <label className="text-[0.75rem] font-semibold text-foreground/80">Temperatura / Criatividade</label>
        <input type="range" min="0" max="1" step="0.05" value={config.temperature ?? 0.7} onChange={(e) => onChange('temperature', parseFloat(e.target.value))} className="w-full accent-primary h-1.5" />
        <p className="text-[0.65rem] text-muted-foreground/50 text-right">{(config.temperature ?? 0.7).toFixed(2)}</p>
      </div>
      <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
        <label className="text-[0.75rem] font-semibold text-foreground/80">Tamanho Máximo</label>
        <input type="number" min={500} max={8000} step={100} value={config.max_tokens ?? 2000} onChange={(e) => onChange('max_tokens', parseInt(e.target.value) || 2000)} className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <p className="text-[0.6rem] text-muted-foreground/40">tokens (500–8000)</p>
      </div>
      <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
        <label className="text-[0.75rem] font-semibold text-foreground/80">Profundidade</label>
        <input type="range" min="1" max="5" step="1" value={config.depth_level ?? 3} onChange={(e) => onChange('depth_level', parseInt(e.target.value))} className="w-full accent-primary h-1.5" />
        <p className="text-[0.65rem] text-muted-foreground/50 text-right">{DEPTH_LABELS[config.depth_level ?? 3]} ({config.depth_level ?? 3}/5)</p>
      </div>
      <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
        <label className="text-[0.75rem] font-semibold text-foreground/80">Tom</label>
        <select value={config.tone ?? 'empático e direto'} onChange={(e) => onChange('tone', e.target.value)} className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
          {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
        <label className="text-[0.75rem] font-semibold text-foreground/80">Estilo</label>
        <select value={config.report_style ?? 'narrativo'} onChange={(e) => onChange('report_style', e.target.value)} className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
          {STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
    <div className="flex justify-end">
      <button onClick={onSave} disabled={saving === savingKey} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[0.75rem] font-semibold disabled:opacity-30 hover:opacity-90 transition-all">
        <Save className="w-3.5 h-3.5" /> {saving === savingKey ? 'Salvando...' : 'Salvar Configuração'}
      </button>
    </div>
  </div>
);

const AIConfigPanel = ({
  globalAiConfig, editedGlobalAi, setEditedGlobalAi, onSaveGlobalAi,
  currentModule, editedTai, onUpdateTestAiField, onSaveTestAi,
  saving, selectedModule, expandedGlobal, onToggleGlobal,
}: AIConfigPanelProps) => {
  return (
    <div className="space-y-4">
      {/* Test-specific AI Config */}
      {currentModule && (
        <div className="border border-violet-500/20 rounded-2xl p-5 bg-violet-500/[0.02] space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-violet-500/60" />
            <h3 className="text-[0.85rem] font-semibold text-violet-600 dark:text-violet-400">Configuração de IA — {currentModule.name}</h3>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-card/40">
            <div>
              <p className="text-[0.8rem] font-semibold">Herdar configuração global</p>
              <p className="text-[0.65rem] text-muted-foreground/50">Usar os mesmos parâmetros da config padrão</p>
            </div>
            <button onClick={() => onUpdateTestAiField('use_global_defaults', !(editedTai.use_global_defaults ?? true))} className="p-1 hover:bg-muted/30 rounded-lg transition-colors">
              {(editedTai.use_global_defaults ?? true) ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
            </button>
          </div>
          <ConfigFields
            config={editedTai}
            onChange={onUpdateTestAiField}
            onSave={onSaveTestAi}
            savingKey={`tai_${selectedModule}`}
            saving={saving}
            disabled={editedTai.use_global_defaults ?? true}
          />
        </div>
      )}

      {/* Global AI Config */}
      <div className="space-y-3">
        <button onClick={onToggleGlobal} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center"><Sliders className="w-4 h-4 text-violet-500" /></div>
            <div className="text-left">
              <h2 className="text-[0.9rem] font-semibold">Configuração Global de IA</h2>
              <p className="text-[0.7rem] text-muted-foreground/50">Modelo, parâmetros e padrões herdados por todos os testes</p>
            </div>
          </div>
          {expandedGlobal ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </button>
        {expandedGlobal && globalAiConfig && (
          <div className="pl-2 space-y-4">
            {/* Model Selector */}
            <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.02] space-y-3">
              <h4 className="text-[0.8rem] font-semibold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-500/60" />
                Modelo de IA
              </h4>
              <p className="text-[0.68rem] text-muted-foreground/50">
                Modelo ativo: <span className="font-mono text-primary">{AI_MODELS.find(m => m.value === (editedGlobalAi as GlobalAiConfig).ai_model)?.label || (editedGlobalAi as GlobalAiConfig).ai_model}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_MODELS.map(model => (
                  <button
                    key={model.value}
                    onClick={() => setEditedGlobalAi(prev => ({ ...prev, ai_model: model.value }))}
                    className={`text-left px-3 py-2.5 rounded-lg text-[0.75rem] transition-all border ${
                      (editedGlobalAi as GlobalAiConfig).ai_model === model.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/30 text-muted-foreground/60 hover:border-primary/30'
                    }`}
                  >
                    <div className="font-medium">{model.label}</div>
                    <div className="text-[0.65rem] opacity-70 mt-0.5">{model.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <ConfigFields
              config={editedGlobalAi}
              onChange={(f, v) => setEditedGlobalAi(prev => ({ ...prev, [f]: v }))}
              onSave={onSaveGlobalAi}
              savingKey="global_ai"
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AIConfigPanel;
