import { motion } from 'framer-motion';
import { Bell, Trash2 } from 'lucide-react';
import type { Reminder, TestModule } from './types';
import { fadeUp } from './types';

interface RemindersTabProps {
  reminders: Reminder[];
  modules: TestModule[];
  newReminderDate: string;
  newReminderModule: string;
  onReminderDateChange: (value: string) => void;
  onReminderModuleChange: (value: string) => void;
  onAddReminder: () => void;
  onCompleteReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export function RemindersTab({
  reminders, modules, newReminderDate, newReminderModule,
  onReminderDateChange, onReminderModuleChange, onAddReminder, onCompleteReminder, onDeleteReminder,
}: RemindersTabProps) {
  return (
    <motion.div key="reminders" {...fadeUp} className="space-y-4">
      <div className="bg-card border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Novo Lembrete de Reteste
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Teste (opcional)</label>
            <select value={newReminderModule} onChange={e => onReminderModuleChange(e.target.value)}
              className="w-full h-10 rounded-lg border border-border/40 bg-background/60 px-3 text-sm">
              <option value="">Qualquer teste</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data do lembrete</label>
            <input type="date" value={newReminderDate} onChange={e => onReminderDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full h-10 rounded-lg border border-border/40 bg-background/60 px-3 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={onAddReminder} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 w-full h-10">
              Criar
            </button>
          </div>
        </div>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-8 bg-card border rounded-xl">
          <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum lembrete agendado.</p>
        </div>
      ) : reminders.map(r => {
        const mod = modules.find(m => m.id === r.test_module_id);
        const isPast = new Date(r.remind_at) < new Date();
        return (
          <div key={r.id} className={`bg-card border rounded-xl p-5 flex items-center justify-between ${
            r.status === 'completed' ? 'opacity-50' : isPast ? 'border-amber-500/30' : ''
          }`}>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {mod?.name || 'Qualquer teste'}
                {isPast && r.status === 'pending' && <span className="ml-2 text-xs text-amber-600">⚠ Atrasado</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.remind_at + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {r.status === 'pending' && (
                <button onClick={() => onCompleteReminder(r.id)} className="text-xs bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20">
                  ✓ Concluído
                </button>
              )}
              <button onClick={() => onDeleteReminder(r.id)} className="text-muted-foreground hover:text-red-500 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
