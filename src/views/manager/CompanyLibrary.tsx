// "Company library" in the manager's Knowledge base: the videos, PDF summaries and step guides ReadyCheck AI answers from.
// Every card can be edited or discarded (and restored). The app sends the live cards with each question, so a change reaches employees straight away.
import { useState } from 'react';
import type { CardSpec, LibraryEntry } from '../../types';
import { useApp } from '../../state/AppState';
import { THEMES_BY_KEY } from '../../data/command';
import { KIND, docUrl } from '../../components/cards/ActionCard';
import { REASONS } from '../../components/shell/KbCard';
import { Icon } from '../../components/primitives';
import { cx, fmt } from '../../lib/util';

type Kind = CardSpec['type'];
type Filter = 'all' | Kind;
const ORDER: Kind[] = ['video', 'doc', 'steps'];
const FILTERS: [Filter, string][] = [['all', 'All'], ['video', 'Videos'], ['doc', 'PDF summaries'], ['steps', 'Step guides']];
const SHOWN = 3;

/** What the "one per line" box holds for each kind of card. */
const LINES: Record<Kind, { label: string; hint: string }> = {
  video: { label: 'Chapters', hint: 'One per line, starting with its time, like 1:30 Approve the prompt' },
  doc: { label: 'Key points', hint: 'One per line. Add the PDF page after a |, like Public Wi-Fi is fine | 6' },
  steps: { label: 'Steps', hint: 'One per line. Add a detail after a |, like Install GlobalConnect | Open Self Service' },
};

const CHAPTER = /^(\d+):([0-5]\d)\s+(\S.*)$/;
const PAGED_POINT = /^(.*\S)\s*\|\s*(\d+)$/;

function meta(card: CardSpec): string {
  if (card.type === 'video') return fmt(card.props.duration);
  if (card.type === 'doc') return card.props.pages + ' pages';
  return card.props.steps.length + ' steps';
}

/** The card's chapters, key points or steps as the edit box shows them. */
function toLines(card: CardSpec): string {
  if (card.type === 'video') return (card.props.chapters ?? []).map((c) => `${fmt(c.t)} ${c.label}`).join('\n');
  if (card.type === 'doc') return card.props.points.map((p) => (p.page ? `${p.text} | ${p.page}` : p.text)).join('\n');
  return card.props.steps.map((s) => (s.detail ? `${s.label} | ${s.detail}` : s.label)).join('\n');
}

/** Turns the edit form back into a card, or says what to fix. Anything the form doesn't show (duration, PDF file) stays as it was. */
function fromForm(card: CardSpec, title: string, source: string, text: string): { card: CardSpec } | { error: string } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const head = { title: title.trim(), source: source.trim() || undefined };
  if (!head.title) return { error: 'Add a title.' };
  if (card.type === 'video') {
    const chapters: { t: number; label: string }[] = [];
    for (const line of lines) {
      const m = CHAPTER.exec(line);
      if (!m) return { error: `Start each chapter with a time, like 1:30. Check “${line.slice(0, 40)}”.` };
      const t = Number(m[1]) * 60 + Number(m[2]);
      if (t >= card.props.duration) return { error: `Chapters must start before the video ends (${fmt(card.props.duration)}).` };
      chapters.push({ t, label: m[3].trim() });
    }
    return { card: { ...card, props: { ...card.props, ...head, chapters: chapters.sort((a, b) => a.t - b.t) } } };
  }
  if (!lines.length) return { error: card.type === 'doc' ? 'Add at least one key point.' : 'Add at least one step.' };
  if (card.type === 'doc') {
    const points: { text: string; page?: number }[] = [];
    for (const line of lines) {
      const m = PAGED_POINT.exec(line);
      if (m && (Number(m[2]) < 1 || Number(m[2]) > card.props.pages)) return { error: `Pages run from 1 to ${card.props.pages}.` };
      points.push(m ? { text: m[1], page: Number(m[2]) } : { text: line });
    }
    return { card: { ...card, props: { ...card.props, ...head, points } } };
  }
  const steps = lines.map((line) => {
    const [label, ...rest] = line.split('|');
    const detail = rest.join('|').trim();
    return detail ? { label: label.trim(), detail } : { label: label.trim() };
  });
  if (steps.some((s) => !s.label)) return { error: 'Every step needs some text before the |.' };
  return { card: { ...card, props: { ...card.props, ...head, steps, done: card.props.done?.filter((i) => i < steps.length) } } };
}

interface LibraryCardProps {
  entry: LibraryEntry;
  onEdit: (id: string, card: CardSpec) => void;
  onDiscard: (id: string, reason: string) => void;
  onRestore: (id: string) => void;
}

function LibraryCard({ entry, onEdit, onDiscard, onRestore }: LibraryCardProps) {
  const { card } = entry, gone = entry.status === 'discarded';
  const topic = THEMES_BY_KEY[entry.topic].name, kind = KIND[card.type];
  const [mode, setMode] = useState<'view' | 'edit' | 'discard'>('view');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [lines, setLines] = useState('');
  const [reason, setReason] = useState('');

  const head = (
    <div className="rc-kb-top">
      <span className={cx('rc-lib-type', 'is-' + card.type)}><Icon name={kind.icon} size={13} />{kind.label} · {meta(card)}</span>
      <span className={cx('rc-kb-st', 'is-' + entry.status)}><i />{gone ? 'Discarded' : entry.edited ? 'Live · edited' : 'Live for new hires'}</span>
    </div>
  );

  if (mode === 'edit') {
    const parsed = fromForm(card, title, source, lines);
    return (
      <div className="rc-kb is-live is-editing">
        {head}
        <label className="rc-kb-lab">Title<input className="rc-kb-input" value={title} maxLength={90} onChange={(e) => setTitle(e.target.value)} aria-invalid={!title.trim()} /></label>
        <label className="rc-kb-lab">Description<input className="rc-kb-input" value={source} maxLength={120} onChange={(e) => setSource(e.target.value)} /></label>
        <label className="rc-kb-lab">{LINES[card.type].label}<span className="rc-kb-hint">{LINES[card.type].hint}</span>
          <textarea className="rc-kb-area is-steps" rows={Math.max(4, lines.split('\n').length + 1)} value={lines} onChange={(e) => setLines(e.target.value)} aria-invalid={'error' in parsed} /></label>
        {'error' in parsed ? <p className="rc-kb-hint" role="status">{parsed.error}</p> : null}
        <p className="rc-kb-m">Topic: {topic}</p>
        <div className="rc-kb-act">
          <button type="button" className="rc-btn-primary is-sm" disabled={'error' in parsed} onClick={() => { if ('card' in parsed) { onEdit(card.id, parsed.card); setMode('view'); } }}>
            <Icon name="check" size={15} strokeWidth={2.2} />Save changes
          </button>
          <button type="button" className="rc-quiet" onClick={() => setMode('view')}>Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === 'discard') {
    return (
      <div className="rc-kb is-live is-discarding">
        {head}
        <h3 className="rc-kb-t">{card.props.title}</h3>
        <p className="rc-kb-q" id={'rc-why-' + card.id}>Why discard this card?</p>
        <div className="rc-kb-reasons" role="radiogroup" aria-labelledby={'rc-why-' + card.id}>
          {REASONS.map((r) => <button key={r} type="button" role="radio" aria-checked={reason === r} className={cx('rc-kb-reason', reason === r && 'is-on')} onClick={() => setReason(r)}>{r}</button>)}
        </div>
        <p className="rc-kb-m">ReadyCheck AI stops using it straight away. It moves to Discarded, and you can restore it later.</p>
        <div className="rc-kb-act">
          <button type="button" className="rc-btn-ghost is-sm" disabled={!reason} onClick={() => { onDiscard(card.id, reason); setMode('view'); setReason(''); }}>Discard card</button>
          <button type="button" className="rc-quiet" onClick={() => { setMode('view'); setReason(''); }}>Keep it</button>
        </div>
      </div>
    );
  }

  const rows = card.type === 'video' ? card.props.chapters ?? [] : card.type === 'doc' ? card.props.points : [];
  const shown = card.type === 'video' ? rows : rows.slice(0, SHOWN);
  return (
    <div className={cx('rc-kb', 'is-' + entry.status, 'rc-lib')}>
      {card.type === 'video' ? (
        <div className="rc-lib-thumb" aria-hidden>
          <span><Icon name="play" size={16} /></span>
          <em>{fmt(card.props.duration)}</em>
        </div>
      ) : null}
      {head}
      <h3 className="rc-kb-t">{card.props.title}</h3>
      <p className="rc-kb-p">{card.props.source}</p>
      {card.type === 'steps' ? (
        // Numbered like every other knowledge-base card, and every step is shown.
        <ol className="rc-kb-steps" aria-label="Steps">
          {card.props.steps.map((s, i) => (
            <li key={i}><span>{s.label}{s.detail ? <small className="rc-lib-detail">{s.detail}</small> : null}</span></li>
          ))}
        </ol>
      ) : (
        <ul className="rc-lib-lines" aria-label={card.type === 'video' ? 'Chapters' : 'Key points'}>
          {shown.map((line, i) => (
            't' in line
              ? <li key={i}><span className="rc-lib-t">{fmt(line.t)}</span>{line.label}</li>
              : <li key={i}>{line.text}</li>
          ))}
          {rows.length > shown.length ? <li className="rc-lib-more">+{rows.length - shown.length} more</li> : null}
        </ul>
      )}
      <p className="rc-kb-m">
        {card.type === 'doc' ? <><a className="rc-lib-file" href={docUrl(card.props.file)} target="_blank" rel="noopener noreferrer" title="Open the sample PDF">{card.props.file}</a> · </> : null}
        Topic: {topic}
      </p>
      {gone ? (
        <div className="rc-kb-gone">
          <span>Reason: <b>{entry.discardReason || 'No reason given'}</b></span>
          <button type="button" className="rc-btn-ghost is-sm" onClick={() => onRestore(card.id)}><Icon name="undo" size={15} />Restore</button>
        </div>
      ) : (
        <div className="rc-kb-act">
          <button type="button" className="rc-btn-ghost is-sm" onClick={() => { setTitle(card.props.title); setSource(card.props.source ?? ''); setLines(toLines(card)); setMode('edit'); }}><Icon name="edit" size={15} />Edit</button>
          <button type="button" className="rc-btn-ghost is-sm" onClick={() => setMode('discard')}>Discard</button>
        </div>
      )}
    </div>
  );
}

export function CompanyLibrary() {
  const { library, lib } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [showGone, setShowGone] = useState(false);
  // Videos first, so they are the first thing a visitor sees. sort() is stable, so each group keeps its scenario order.
  const live = library.filter((e) => e.status === 'live').sort((a, b) => ORDER.indexOf(a.card.type) - ORDER.indexOf(b.card.type));
  const gone = library.filter((e) => e.status === 'discarded');
  const count = (f: Filter) => (f === 'all' ? live.length : live.filter((e) => e.card.type === f).length);
  const list = live.filter((e) => filter === 'all' || e.card.type === filter);
  const grid = (entries: LibraryEntry[]) => (
    <ul className="rc-kb-grid">
      {entries.map((e) => <li key={e.card.id}><LibraryCard entry={e} onEdit={lib.edit} onDiscard={lib.discard} onRestore={lib.restore} /></li>)}
    </ul>
  );
  return (
    <section aria-labelledby="rc-lib-h">
      <div className="rc-sec-row">
        <h2 className="rc-sec-h" id="rc-lib-h"><i className="rc-state-dot is-room" />Company library</h2>
        <div className="rc-seg" role="group" aria-label="Library content type">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} className={cx(filter === key && 'is-on')} onClick={() => setFilter(key)}>{label} · {count(key)}</button>
          ))}
        </div>
      </div>
      <p className="rc-sec-s">The onboarding videos, PDF summaries and step guides ReadyCheck AI answers from. When an employee asks, it picks the single best card from here or from the live cards above. If nothing fits, it says “I don’t know” and points to a human expert. Edit a card to fix what employees see, or discard one so it is no longer used.</p>
      {list.length ? grid(list) : <p className="rc-sec-empty">No cards here. Restore one from Discarded below.</p>}
      {gone.length ? (
        <>
          <button type="button" className="rc-link-btn" aria-expanded={showGone} onClick={() => setShowGone(!showGone)}>
            Discarded library cards ({gone.length})<Icon name="chevron" size={14} className={showGone ? 'rc-chev-up' : 'rc-chev-down'} />
          </button>
          {showGone ? grid(gone) : null}
        </>
      ) : null}
    </section>
  );
}
