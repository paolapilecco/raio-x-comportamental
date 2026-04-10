import { motion } from 'framer-motion';
import { Plus, Save, StickyNote, Trash2 } from 'lucide-react';
import type { Note } from './types';
import { fadeUp } from './types';

interface NotesTabProps {
  notes: Note[];
  newNote: string;
  savingNote: boolean;
  onNewNoteChange: (value: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
}

export function NotesTab({ notes, newNote, savingNote, onNewNoteChange, onAddNote, onDeleteNote }: NotesTabProps) {
  return (
    <motion.div key="notes" {...fadeUp} className="space-y-4">
      <div className="bg-card border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Nova Nota
        </h3>
        <textarea
          value={newNote} onChange={e => onNewNoteChange(e.target.value)}
          placeholder="Adicione observações sobre este paciente..."
          className="w-full h-24 rounded-lg border border-border/40 bg-background/60 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          maxLength={2000}
        />
        <button onClick={onAddNote} disabled={savingNote || !newNote.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          <Save className="w-3.5 h-3.5" /> {savingNote ? 'Salvando...' : 'Salvar nota'}
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8 bg-card border rounded-xl">
          <StickyNote className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>
        </div>
      ) : notes.map(note => (
        <div key={note.id} className="bg-card border rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(note.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button onClick={() => onDeleteNote(note.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
