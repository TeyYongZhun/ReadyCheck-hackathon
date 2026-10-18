import { useState } from 'react';
import type { KbItem } from '../../types';
import { cx } from '../../lib/util';
import { AttachChips, Icon } from '../primitives';

const REASONS = ['Not accurate', 'Already covered', 'Out of date', 'Too specific to one person', 'Other'];

interface KbCardProps {
  kb: KbItem;
  compact?: boolean;
  onApprove?: (id: string) => void;
  onEdit?: (id: string, patch: Pick<KbItem, 'title' | 'problem' | 'steps'>) => void;
  onDiscard?: (id: string, reason: string) => void;
  onRestore?: (id: string) => void;
}

/** A knowledge-base card: AI draft from a solved room, or material a manager wrote. View, edit, discard. */
export function KbCard({ kb: k, compact, onApprove, onEdit, onDiscard, onRestore }: KbCardProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'discard'>('view');
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [steps, setSteps] = useState('');
  const [reason, setReason] = useState('');

  const reviewing = k.status === 'review', isLive = k.status === 'live';
  const meta = k.manual ? `Added by ${k.pic.name} · ${k.at ?? 'Today'}` : `From ${k.roomName} · solved by ${k.pic.first} with ${k.employee}`;
  const stLabel = isLive ? 'Live for new hires' : k.status === 'discarded' ? 'Discarded' : k.manual ? 'Draft' : k.edited ? 'Draft · edited' : 'Needs manager review';
  const head = (
    <div className="rc-kb-top">
      <span className="rc-ai-label">{k.manual ? 'Written by you' : k.edited ? 'AI summary · edited' : 'AI summary'}</span>
      <span className={cx('rc-kb-st', 'is-' + k.status)}><i />{stLabel}</span>
    </div>
  );
  const patch = { title: title.trim(), problem: problem.trim(), steps: steps.split('\n').map((x) => x.trim()).filter(Boolean) };
  const valid = !!patch.title && patch.steps.length > 0;

  if (mode === 'edit' && onEdit) {
    return (
      <div className={cx('rc-kb', 'is-' + k.status, 'is-editing')}>
        {head}
        <label className="rc-kb-lab">Title<input className="rc-kb-input" value={title} maxLength={90} onChange={(e) => setTitle(e.target.value)} aria-invalid={!patch.title} /></label>
        <label className="rc-kb-lab">What the problem was<textarea className="rc-kb-area" rows={3} value={problem} onChange={(e) => setProblem(e.target.value)} /></label>
        <label className="rc-kb-lab">Steps<span className="rc-kb-hint">One step per line</span>
          <textarea className="rc-kb-area is-steps" rows={Math.max(4, patch.steps.length + 1)} value={steps} onChange={(e) => setSteps(e.target.value)} aria-invalid={!patch.steps.length} /></label>
        <p className="rc-kb-m">{meta}</p>
        <div className="rc-kb-act">
          <button type="button" className="rc-btn-primary is-sm" disabled={!valid} onClick={() => { onEdit(k.id, patch); if (reviewing) onApprove?.(k.id); setMode('view'); }}>
            <Icon name="check" size={15} strokeWidth={2.2} />{isLive ? 'Save changes' : k.manual ? 'Publish' : 'Approve'}
          </button>
          {reviewing ? <button type="button" className="rc-btn-ghost is-sm" disabled={!valid} onClick={() => { onEdit(k.id, patch); setMode('view'); }}>Save draft</button> : null}
          <button type="button" className="rc-quiet" onClick={() => setMode('view')}>Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === 'discard' && onDiscard) {
    return (
      <div className="rc-kb is-review is-discarding">
        {head}
        <h3 className="rc-kb-t">{k.title}</h3>
        <p className="rc-kb-q" id={'rc-why-' + k.id}>Why discard this card?</p>
        <div className="rc-kb-reasons" role="radiogroup" aria-labelledby={'rc-why-' + k.id}>
          {REASONS.map((r) => <button key={r} type="button" role="radio" aria-checked={reason === r} className={cx('rc-kb-reason', reason === r && 'is-on')} onClick={() => setReason(r)}>{r}</button>)}
        </div>
        <p className="rc-kb-m">It moves to Discarded. You can restore it later.</p>
        <div className="rc-kb-act">
          <button type="button" className="rc-btn-ghost is-sm" disabled={!reason} onClick={() => { onDiscard(k.id, reason); setMode('view'); setReason(''); }}>Discard card</button>
          <button type="button" className="rc-quiet" onClick={() => { setMode('view'); setReason(''); }}>Keep it</button>
        </div>
      </div>
    );
  }

  const startEdit = () => { setTitle(k.title); setProblem(k.problem ?? ''); setSteps(k.steps.join('\n')); setMode('edit'); };
  return (
    <div className={cx('rc-kb', 'is-' + k.status)}>
      {head}
      <h3 className="rc-kb-t">{k.title}</h3>
      {compact ? null : <p className="rc-kb-p">{k.problem}</p>}
      <ol className="rc-kb-steps">{k.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {k.files?.length ? <AttachChips items={k.files} className="rc-att-kb" /> : null}
      <p className="rc-kb-m">{meta}</p>
      {k.status === 'discarded' ? (
        <div className="rc-kb-gone">
          <span>Reason: <b>{k.discardReason || 'No reason given'}</b></span>
          {onRestore ? <button type="button" className="rc-btn-ghost is-sm" onClick={() => onRestore(k.id)}><Icon name="undo" size={15} />Restore</button> : null}
        </div>
      ) : null}
      {isLive && onEdit ? <div className="rc-kb-act"><button type="button" className="rc-btn-ghost is-sm" onClick={startEdit}><Icon name="edit" size={15} />Edit</button></div> : null}
      {reviewing && onApprove ? (
        <div className="rc-kb-act">
          <button type="button" className="rc-btn-primary is-sm" onClick={() => onApprove(k.id)}><Icon name="check" size={15} strokeWidth={2.2} />{k.manual ? 'Publish' : 'Approve'}</button>
          {onEdit ? <button type="button" className="rc-btn-ghost is-sm" onClick={startEdit}><Icon name="edit" size={15} />Edit</button> : null}
          {onDiscard ? <button type="button" className="rc-btn-ghost is-sm" onClick={() => setMode('discard')}>Discard</button> : null}
        </div>
      ) : null}
    </div>
  );
}
