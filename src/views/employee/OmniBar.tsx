import { useEffect, useRef } from 'react';
import type { Attachment } from '../../types';
import { cx } from '../../lib/util';
import { AddFilesButton, AttachChips, Icon } from '../../components/primitives';

interface Suggestion { label: string; query: string; icon?: string }

interface OmniBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  /** Shows "Assembling cards" and the scan line. */
  busy?: boolean;
  /** 56px tall once results are on the canvas. */
  compact?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** Starters under the bar; each fills the bar for editing rather than submitting. */
  suggestions?: Suggestion[] | null;
  attachments: Attachment[];
  onAttach: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
}

/** The one input on the employee canvas. ⌘K / Ctrl+K focuses it. */
export function OmniBar(p: OmniBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { if (p.autoFocus) inputRef.current?.focus({ preventScroll: true }); }, []);

  const submit = (e: React.FormEvent) => { e.preventDefault(); const v = p.value.trim(); if (v) p.onSubmit(v); };
  return (
    <div className={cx('rc-omni', p.busy && 'is-busy', p.compact && 'is-compact')}>
      <form className="rc-omni-bar rc-glass rc-glass-3" onSubmit={submit} role="search">
        <span className="rc-omni-lead"><Icon name="search" size={20} /></span>
        <input ref={inputRef} className="rc-omni-input" value={p.value} placeholder={p.placeholder ?? 'Ask ReadyCheck anything'} aria-label="Ask ReadyCheck"
          onChange={(e) => p.onChange(e.target.value)} autoComplete="off" spellCheck={false} />
        {p.busy ? <span className="rc-omni-status" role="status">Assembling cards</span> : <AddFilesButton onFiles={p.onAttach} />}
        <button type="submit" className="rc-omni-go" aria-label="Ask" disabled={!p.value.trim() || p.busy}><Icon name="enter" size={18} strokeWidth={1.9} /></button>
        <span className="rc-omni-scan" aria-hidden />
      </form>
      {p.attachments.length ? <AttachChips items={p.attachments} onRemove={p.onRemoveAttachment} className="rc-att-bar" /> : null}
      {p.suggestions?.length ? (
        <div className="rc-omni-suggest">
          {p.suggestions.map((s) => (
            <button key={s.label} type="button" className="rc-chip" onClick={() => { p.onChange(s.query); inputRef.current?.focus(); }}>
              {s.icon ? <Icon name={s.icon} size={14} /> : null}{s.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
