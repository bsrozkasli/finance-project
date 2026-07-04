import { useState } from 'react';
import type { JournalTrade } from '../../api/client';
import type { TradeEvaluation } from './journalUtils';

interface EvaluationModalProps {
  trade: JournalTrade;
  initial?: TradeEvaluation;
  onClose: () => void;
  onSave: (tradeId: number, evaluation: TradeEvaluation) => void;
}

export const EvaluationModal = ({ trade, initial, onClose, onSave }: EvaluationModalProps) => {
  const [decisionScore, setDecisionScore] = useState(initial?.decisionScore ?? 3);
  const [repeat, setRepeat] = useState(initial?.repeat ?? true);
  const [lesson, setLesson] = useState(initial?.lesson ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!lesson.trim()) {
      setError('Cikarilan ders zorunlu.');
      return;
    }
    onSave(trade.id, { decisionScore, repeat, lesson: lesson.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(6,14,32,0.8)', backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div><div className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Sonuc Degerlendirme</div><div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{trade.symbol} {trade.type}</div></div>
          <button type="button" onClick={onClose} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Kapat</button>
        </div>
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Bu karar dogru muydu?</div>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map(score => <button key={score} type="button" onClick={() => setDecisionScore(score)} className="text-2xl" style={{ color: score <= decisionScore ? 'var(--color-warning)' : 'var(--color-border)' }}>?</button>)}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Tekrar ayni islemi yapar miydin?</div>
          <div className="mt-2 flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setRepeat(true)} className="flex-1 py-2 text-xs font-bold" style={{ background: repeat ? 'var(--color-bull-dim)' : 'var(--color-bg-base)', color: repeat ? 'var(--color-bull)' : 'var(--color-text-secondary)' }}>Evet</button>
            <button type="button" onClick={() => setRepeat(false)} className="flex-1 py-2 text-xs font-bold" style={{ background: !repeat ? 'var(--color-bear-dim)' : 'var(--color-bg-base)', color: !repeat ? 'var(--color-bear)' : 'var(--color-text-secondary)' }}>Hayir</button>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Cikarilan ders</div>
          <textarea value={lesson} onChange={event => setLesson(event.target.value)} rows={4} className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
        {error && <div className="mt-3 text-xs" style={{ color: 'var(--color-bear)' }}>{error}</div>}
        <button type="button" onClick={save} className="mt-4 w-full rounded-lg py-2 text-sm font-bold" style={{ background: 'var(--color-accent)', color: '#fff' }}>Kaydet</button>
      </div>
    </div>
  );
};