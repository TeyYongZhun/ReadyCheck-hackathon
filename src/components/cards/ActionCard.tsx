import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import type { CardKind, CardState, DocCardData, StepsCardData, VideoCardData } from '../../types';
import { cx, fmt } from '../../lib/util';
import { Icon } from '../primitives';

export const KIND: Record<CardKind, { icon: string; label: string }> = {
  video: { icon: 'video', label: 'Video' },
  doc: { icon: 'doc', label: 'PDF summary' },
  steps: { icon: 'steps', label: 'Steps' },
  answer: { icon: 'ready', label: 'Answer' },
};

export interface CardHandlers {
  state?: CardState;
  onSolved?: () => void;
  onEscalate?: () => void;
  onUndo?: () => void;
}

/** "Did this get you ready?" · Solved · Need human expert */
export function FeedbackBar({ state = 'idle', onSolved, onEscalate, onUndo }: CardHandlers) {
  if (state === 'solved') {
    return (
      <div className="rc-fb is-solved" role="status">
        <span className="rc-fb-tick"><Icon name="check" size={13} strokeWidth={2.2} /></span>
        <span>Marked solved. Nice, you’re ready.</span>
        {onUndo ? <button type="button" className="rc-fb-undo" onClick={onUndo}>Undo</button> : null}
      </div>
    );
  }
  const busy = state !== 'idle';
  return (
    <div className="rc-fb">
      <span className="rc-fb-q">Did this get you ready?</span>
      <div className="rc-fb-actions">
        <button type="button" className="rc-fb-btn rc-fb-solved" onClick={onSolved} disabled={busy}><Icon name="check" size={15} strokeWidth={2} />Solved</button>
        <button type="button" className="rc-fb-btn rc-fb-expert" onClick={onEscalate} disabled={busy}><Icon name="expert" size={15} />Need human expert</button>
      </div>
    </div>
  );
}

interface ActionCardProps extends CardHandlers {
  kind: CardKind; kindLabel?: string; title: string; source?: string; meta?: string; feedback?: boolean; children?: ReactNode;
}

/** The shell every answer card is built on. */
export const ActionCard = forwardRef<HTMLElement, ActionCardProps>(function ActionCard(p, ref) {
  const state = p.state ?? 'idle';
  const k = KIND[p.kind];
  return (
    <article ref={ref} data-kind={p.kind} className={cx('rc-card rc-glass rc-glass-2', state === 'solved' && 'is-solved', state === 'escalating' && 'is-escalating')}>
      <header className="rc-card-head">
        <span className="rc-card-kind"><Icon name={k.icon} size={14} />{p.kindLabel ?? k.label}</span>
        {p.meta ? <span className="rc-card-meta">{p.meta}</span> : null}
      </header>
      <h3 className="rc-card-title">{p.title}</h3>
      {p.source ? <p className="rc-card-source">{p.source}</p> : null}
      {p.children ? <div className="rc-card-body">{p.children}</div> : null}
      {p.feedback === false ? null : <FeedbackBar state={state} onSolved={p.onSolved} onEscalate={p.onEscalate} onUndo={p.onUndo} />}
    </article>
  );
});

export const VideoCard = forwardRef<HTMLElement, VideoCardData & CardHandlers>(function VideoCard(p, ref) {
  const dur = p.duration || 180;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    // Simulated playback. TODO: swap for a real <video> element once media URLs exist.
    const id = setInterval(() => setT((x) => { if (x + 1 >= dur) { setPlaying(false); return dur; } return x + 1; }), 250);
    return () => clearInterval(id);
  }, [playing, dur]);
  const ch = p.chapters ?? [];
  const cur = ch.reduce((a, c, i) => (t >= c.t ? i : a), 0);
  return (
    <ActionCard ref={ref} kind="video" meta={fmt(dur)} {...p}>
      <div className={cx('rc-video', playing && 'is-playing')}>
        <div className="rc-video-poster" aria-hidden>
          <span className="rc-vp-a" /><span className="rc-vp-b" /><span className="rc-vp-c" />
          <span className="rc-video-chapter">{ch[cur]?.label ?? ''}</span>
        </div>
        <button type="button" className="rc-video-play" aria-label={playing ? 'Pause' : 'Play'} onClick={() => { if (t >= dur) setT(0); setPlaying(!playing); }}>
          <Icon name={playing ? 'pause' : 'play'} size={22} />
        </button>
        <div className="rc-video-bar">
          <div className="rc-video-track">
            <div className="rc-video-fill" style={{ width: (t / dur) * 100 + '%' }} />
            {ch.map((c, i) => (i ? <span key={i} className="rc-video-tick" style={{ left: (c.t / dur) * 100 + '%' }} /> : null))}
          </div>
          <span className="rc-video-time">{fmt(t)} / {fmt(dur)}</span>
        </div>
      </div>
      {ch.length ? (
        <ol className="rc-chapters">
          {ch.map((c, i) => (
            <li key={i}>
              <button type="button" className={cx('rc-chapter', i === cur && 'is-current')} onClick={() => { setT(c.t); setPlaying(true); }}>
                <span className="rc-chapter-t">{fmt(c.t)}</span><span className="rc-chapter-l">{c.label}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </ActionCard>
  );
});

/** Where a card's PDF lives. The files are mock documents in public/docs. */
export function docUrl(file: string): string {
  return '/docs/' + encodeURIComponent(file);
}

export const DocSummaryCard = forwardRef<HTMLElement, DocCardData & CardHandlers & { collapsedCount?: number }>(function DocSummaryCard(p, ref) {
  const [open, setOpen] = useState(false);
  const n = p.collapsedCount ?? 3;
  const shown = open ? p.points : p.points.slice(0, n);
  const href = docUrl(p.file); // a mock PDF served from public/docs
  return (
    <ActionCard ref={ref} kind="doc" meta={p.pages + ' pages'} {...p}>
      <a className="rc-doc-file" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.file} in a new tab`}>
        <span className="rc-doc-thumb" aria-hidden><i /><i /><i /><i /></span>
        <div className="rc-doc-filetext">
          <div className="rc-doc-name">{p.file}</div>
          {p.updated ? <div className="rc-doc-sub">{p.updated}</div> : null}
        </div>
        <span className="rc-doc-open" title="Open document"><Icon name="arrow" size={15} /></span>
      </a>
      <div className="rc-doc-label">Key points</div>
      <ul className="rc-doc-points">
        {shown.map((pt, i) => (
          <li key={i}>
            <span className="rc-doc-dot" aria-hidden /><span className="rc-doc-text">{pt.text}</span>
            {pt.page ? <a className="rc-doc-page" href={`${href}#page=${pt.page}`} target="_blank" rel="noopener noreferrer" title={`Open page ${pt.page}`}>p.{pt.page}</a> : null}
          </li>
        ))}
      </ul>
      {p.points.length > n ? <button type="button" className="rc-link" onClick={() => setOpen(!open)}>{open ? 'Show fewer' : `Show all ${p.points.length} points`}</button> : null}
    </ActionCard>
  );
});

export const ChecklistCard = forwardRef<HTMLElement, StepsCardData & CardHandlers>(function ChecklistCard(p, ref) {
  const [done, setDone] = useState<number[]>(p.done ?? []);
  const toggle = (i: number) => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  return (
    <ActionCard ref={ref} kind="steps" meta={`${done.length} / ${p.steps.length}`} {...p}>
      <div className="rc-steps-meter" aria-hidden><span style={{ width: (p.steps.length ? (done.length / p.steps.length) * 100 : 0) + '%' }} /></div>
      <ol className="rc-steps">
        {p.steps.map((s, i) => {
          const on = done.includes(i);
          return (
            <li key={i}>
              <button type="button" className={cx('rc-step', on && 'is-done')} aria-pressed={on} onClick={() => toggle(i)}>
                <span className="rc-step-box">{on ? <Icon name="check" size={13} strokeWidth={2.4} /> : String(i + 1)}</span>
                <span className="rc-step-text">
                  <span className="rc-step-label">{s.label}</span>
                  {s.detail ? <span className="rc-step-detail">{s.detail}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {p.materials?.length ? (
        <div className="rc-card-materials">
          <span className="rc-card-materials-label">Reference material</span>
          {p.materials.map((material) => material.mimeType === 'application/pdf' ? (
            <details key={material.name} className="rc-card-material">
              <summary><Icon name="doc" size={14} />View {material.name}</summary>
              <iframe title={material.name} src={material.url} />
            </details>
          ) : (
            <details key={material.name} className="rc-card-material">
              <summary><Icon name="video" size={14} />Play {material.name}</summary>
              <video controls preload="metadata" src={material.url} />
            </details>
          ))}
        </div>
      ) : null}
    </ActionCard>
  );
});
