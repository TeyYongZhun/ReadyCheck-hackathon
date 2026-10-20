// "Company library" in the manager's Knowledge base: the videos, PDF summaries and step guides ReadyCheck AI answers from.
// Read-only. These are the same SCENARIOS cards the server searches (server/library.ts), so what is listed here is exactly what employees can get.
import { useState } from 'react';
import type { CardKind, CardSpec } from '../../types';
import { SCENARIOS, SCEN_THEME } from '../../data/scenarios';
import { THEMES_BY_KEY } from '../../data/command';
import { KIND } from '../../components/cards/ActionCard';
import { Icon } from '../../components/primitives';
import { cx, fmt } from '../../lib/util';

type Filter = 'all' | CardKind;
const ORDER: CardKind[] = ['video', 'doc', 'steps'];
const FILTERS: [Filter, string][] = [['all', 'All'], ['video', 'Videos'], ['doc', 'PDF summaries'], ['steps', 'Step guides']];
const SHOWN = 3;

interface Item { card: CardSpec; topic: string }

// Videos first, so they are the first thing a visitor sees. sort() is stable, so each group keeps its scenario order.
const ITEMS: Item[] = SCENARIOS
  .flatMap((s) => s.cards.map((card) => ({ card, topic: THEMES_BY_KEY[SCEN_THEME[s.key as keyof typeof SCEN_THEME]].name })))
  .sort((a, b) => ORDER.indexOf(a.card.type) - ORDER.indexOf(b.card.type));

function meta(card: CardSpec): string {
  if (card.type === 'video') return fmt(card.props.duration);
  if (card.type === 'doc') return card.props.pages + ' pages';
  return card.props.steps.length + ' steps';
}

function LibraryCard({ card, topic }: Item) {
  const kind = KIND[card.type];
  const lines = card.type === 'video' ? card.props.chapters ?? []
    : card.type === 'doc' ? card.props.points
    : card.props.steps;
  const shown = card.type === 'video' ? lines : lines.slice(0, SHOWN);
  return (
    <div className="rc-kb is-live rc-lib">
      {card.type === 'video' ? (
        <div className="rc-lib-thumb" aria-hidden>
          <span><Icon name="play" size={16} /></span>
          <em>{fmt(card.props.duration)}</em>
        </div>
      ) : null}
      <div className="rc-kb-top">
        <span className={cx('rc-lib-type', 'is-' + card.type)}><Icon name={kind.icon} size={13} />{kind.label} · {meta(card)}</span>
        <span className="rc-kb-st is-live"><i />Live for new hires</span>
      </div>
      <h3 className="rc-kb-t">{card.props.title}</h3>
      <p className="rc-kb-p">{card.props.source}</p>
      <ul className="rc-lib-lines" aria-label={card.type === 'video' ? 'Chapters' : card.type === 'doc' ? 'Key points' : 'Steps'}>
        {shown.map((line, i) => {
          if ('t' in line) return <li key={i}><span className="rc-lib-t">{fmt(line.t)}</span>{line.label}</li>;
          return <li key={i}>{'text' in line ? line.text : line.label}</li>;
        })}
        {lines.length > shown.length ? <li className="rc-lib-more">+{lines.length - shown.length} more</li> : null}
      </ul>
      <p className="rc-kb-m">{card.type === 'doc' ? card.props.file + ' · ' : ''}Topic: {topic}</p>
    </div>
  );
}

export function CompanyLibrary() {
  const [filter, setFilter] = useState<Filter>('all');
  const count = (f: Filter) => (f === 'all' ? ITEMS.length : ITEMS.filter((i) => i.card.type === f).length);
  const list = ITEMS.filter((i) => filter === 'all' || i.card.type === filter);
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
      <p className="rc-sec-s">The onboarding videos, PDF summaries and step guides ReadyCheck AI answers from. When an employee asks, it picks the single best card from here or from the live cards above. If nothing fits, it says “I don’t know” and points to a human expert.</p>
      <ul className="rc-kb-grid">
        {list.map((item) => <li key={item.card.id}><LibraryCard {...item} /></li>)}
      </ul>
    </section>
  );
}
