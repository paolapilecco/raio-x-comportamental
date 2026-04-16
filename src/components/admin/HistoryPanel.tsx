import { useState } from 'react';
import { History, ChevronDown, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PROMPT_SECTIONS, type TestModule } from './promptConstants';

interface HistoryPanelProps {
  modules: TestModule[];
  expanded: boolean;
  onToggle: () => void;
}

const HistoryPanel = ({ modules, expanded, onToggle }: HistoryPanelProps) => {
  const [historyTestId, setHistoryTestId] = useState('');
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const fetchHistory = async (testId: string) => {
    setHistoryLoading(true);
    const { data, error } = await supabase.from('prompt_history').select('*').eq('test_id', testId).order('changed_at', { ascending: false }).limit(50);
    if (error) toast.error('Erro ao carregar histórico');
    setHistoryEntries((data || []) as any[]);
    setHistoryLoading(false);
  };

  return (
    <div className="space-y-3">
      <button onClick={onToggle} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center"><History className="w-4 h-4 text-orange-500" /></div>
          <div className="text-left">
            <h2 className="text-[0.9rem] font-semibold">Histórico de Alterações</h2>
            <p className="text-[0.7rem] text-muted-foreground/50">Auditoria de mudanças nos prompts</p>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
      </button>

      {expanded && (
        <div className="space-y-3 pl-2">
          <div className="flex items-center gap-2">
            <select value={historyTestId} onChange={(e) => { setHistoryTestId(e.target.value); if (e.target.value) fetchHistory(e.target.value); else setHistoryEntries([]); }} className="flex-1 bg-background/50 border border-border/20 rounded-lg px-3 py-2 text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Selecione um diagnóstico...</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {historyTestId && <button onClick={() => fetchHistory(historyTestId)} className="px-3 py-2 text-[0.7rem] font-semibold bg-muted/40 hover:bg-muted/60 rounded-lg transition-colors">Atualizar</button>}
          </div>
          {historyLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" /></div>}
          {!historyLoading && historyTestId && historyEntries.length === 0 && <p className="text-[0.75rem] text-muted-foreground/40 text-center py-4">Nenhuma alteração registrada.</p>}
          {historyEntries.map((entry) => (
            <div key={entry.id} className="border border-border/25 rounded-xl p-3 space-y-2 bg-card/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground/40" />
                  <span className="text-[0.7rem] font-semibold text-foreground/70">{PROMPT_SECTIONS.find(s => s.type === entry.prompt_type)?.label || entry.prompt_type}</span>
                </div>
                <span className="text-[0.6rem] text-muted-foreground/40">{new Date(entry.changed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setExpandedHistoryId(expandedHistoryId === entry.id ? null : entry.id)} className="text-[0.65rem] text-primary/60 hover:text-primary/80 transition-colors">
                  {expandedHistoryId === entry.id ? 'Ocultar diff' : 'Ver alterações'}
                </button>
                {onRestore && entry.old_content && (
                  <button
                    onClick={() => setRestoreTarget(entry)}
                    className="flex items-center gap-1 text-[0.65rem] text-amber-600 hover:text-amber-700 transition-colors"
                    title="Restaurar versão anterior"
                  >
                    <RotateCcw className="w-3 h-3" /> Restaurar
                  </button>
                )}
              </div>
              {expandedHistoryId === entry.id && (
                <div className="space-y-2 mt-1">
                  <div className="p-2 rounded-lg bg-red-500/[0.04] border border-red-500/10">
                    <span className="text-[0.6rem] uppercase tracking-wider text-red-500/50 font-semibold">Antes</span>
                    <p className="text-[0.7rem] text-foreground/50 font-mono whitespace-pre-wrap mt-1 max-h-32 overflow-y-auto">{entry.old_content || '(vazio)'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                    <span className="text-[0.6rem] uppercase tracking-wider text-emerald-500/50 font-semibold">Depois</span>
                    <p className="text-[0.7rem] text-foreground/50 font-mono whitespace-pre-wrap mt-1 max-h-32 overflow-y-auto">{entry.new_content || '(vazio)'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar esta versão?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo atual do prompt <strong>{PROMPT_SECTIONS.find(s => s.type === restoreTarget?.prompt_type)?.label || restoreTarget?.prompt_type}</strong> será substituído pela versão "Antes" desta entrada do histórico. Uma nova entrada de histórico será criada automaticamente registrando esta restauração.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={async (e) => {
                e.preventDefault();
                if (!restoreTarget || !onRestore) return;
                setRestoring(true);
                await onRestore(restoreTarget.test_id, restoreTarget.prompt_type, restoreTarget.old_content || '');
                setRestoring(false);
                setRestoreTarget(null);
                if (historyTestId) await fetchHistory(historyTestId);
              }}
            >
              {restoring ? 'Restaurando…' : 'Sim, restaurar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistoryPanel;
