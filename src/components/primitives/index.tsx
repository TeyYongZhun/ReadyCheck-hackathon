import { useRef, type ReactNode } from 'react';
import type { Attachment, Pic } from '../../types';
import { cx, fileSize, uid } from '../../lib/util';
import { Icon } from './Icon';
import { useAiOffline } from '../../lib/ai-status';

export { Icon } from './Icon';

/** Frosted surface. Level 1 = chips/wells, 2 = cards, 3 = omni bar / overlays. */
export function GlassPanel({ level = 2, className, as: Tag = 'div', children, ...rest }:
  { level?: 1 | 2 | 3; className?: string; as?: 'div' | 'section' | 'article' | 'aside'; children?: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={cx('rc-glass', 'rc-glass-' + level, className)} {...rest}>{children}</Tag>;
}

export function BrandMark({ small }: { small?: boolean }) {
  return <span className={cx('rc-brand-mark', small && 'is-sm')}><Icon name="check" size={small ? 12 : 16} strokeWidth={2.4} /></span>;
}

export function Brand() {
  return <div className="rc-brand rc-side-brand"><BrandMark /><span className="rc-brand-name">ReadyCheck</span></div>;
}

/** Expert avatar (solid ink disc). */
export function PicAvatar({ pic, size, className }: { pic?: Partial<Pic>; size?: number; className?: string }) {
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.32) } : undefined;
  return <span className={cx('rc-pic', className)} style={style} title={pic?.name ? `${pic.name} · ${pic.team}` : undefined}>{pic?.initials ?? '?'}</span>;
}

/** Employee avatar (haze disc). */
export function Person({ initials, className }: { initials: string; className?: string }) {
  return <span className={cx('rc-avatar rc-person', className)}>{initials}</span>;
}

/** Big serif page title + one-line description, the same on every manager tab. */
export function PageHead({ id, title, sub, children }: { id?: string; title: string; sub: string; children?: ReactNode }) {
  return (
    <header className="rc-home-head">
      <div><h2 className="rc-home-h" id={id}>{title}</h2><p className="rc-home-s">{sub}</p></div>
      {children}
    </header>
  );
}

export function AiLabel({ children }: { children: ReactNode }) {
  return <span className="rc-ai-label">{children}</span>;
}

export function GeminiStatus() {
  const offline = useAiOffline();
  if (!offline) return null;
  return <span className="rc-gemini-status" role="status"><i aria-hidden />AI Assistant offline</span>;
}

export function Footnote({ children }: { children: ReactNode }) {
  return <p className="rc-footnote"><Icon name="ready" size={14} />{children}</p>;
}

export function Toast({ children, tone = 'escalate', onClose }: { children: ReactNode; tone?: 'escalate' | 'ready'; onClose: () => void }) {
  return (
    <div className="rc-toast rc-glass rc-glass-3" role="status">
      <span className={cx('rc-toast-dot', tone === 'ready' && 'is-ready')} />
      <span>{children}</span>
      <button type="button" className="rc-toast-x" aria-label="Dismiss" onClick={onClose}><Icon name="close" size={14} /></button>
    </div>
  );
}

const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

export function toAttachment(f: File): Attachment {
  const img = f.type.startsWith('image/');
  let url = '';
  try { if (img) url = URL.createObjectURL(f); } catch { url = ''; }
  return { id: uid('f'), name: f.name, size: f.size, kind: img ? 'image' : 'file', url };
}

export function AttachChips({ items, onRemove, className }: { items: Partial<Attachment>[]; onRemove?: (id: string) => void; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cx('rc-att', className)} aria-label="Attachments">
      {items.map((f, i) => (
        <li key={f.id ?? f.name! + i} className="rc-att-i">
          {f.url ? <img className="rc-att-th" src={f.url} alt="" /> : <span className="rc-att-ic"><Icon name={f.kind === 'image' ? 'image' : 'doc'} size={14} /></span>}
          <span className="rc-att-n" title={f.name}>{f.name}</span>
          {f.size ? <span className="rc-att-s">{fileSize(f.size)}</span> : null}
          {onRemove && f.id ? <button type="button" className="rc-att-x" aria-label={'Remove ' + f.name} onClick={() => onRemove(f.id!)}><Icon name="close" size={12} strokeWidth={2} /></button> : null}
        </li>
      ))}
    </ul>
  );
}

export function AddFilesButton({ onFiles, text = 'Add', className }: { onFiles: (files: FileList) => void; text?: string; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" multiple accept={ACCEPT} hidden tabIndex={-1} aria-hidden
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }} />
      <button type="button" className={cx('rc-omni-add', className)} title="Add a photo or document" aria-label="Add a photo or document" onClick={() => ref.current?.click()}>
        <Icon name="plus" size={16} strokeWidth={2} /><span className="rc-omni-add-t">{text}</span>
      </button>
    </>
  );
}
