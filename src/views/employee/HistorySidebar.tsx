import { useState } from 'react';
import type { HistoryEntry } from '../../types';
import { cx } from '../../lib/util';
import { Icon } from '../../components/primitives';
import { KIND } from '../../components/cards/ActionCard';

export interface HistoryRoom { status: 'waiting' | 'live' | 'solved'; label: string; name?: string; roomId?: string }
export interface HistoryItem { entry: HistoryEntry; room: HistoryRoom | null }

interface Props {
  items: HistoryItem[];
  activeId: string | null;
  open: boolean;
  onToggle: () => void;
  onNew: () => void;
  onPick: (e: HistoryEntry) => void;
  onOpenRoom: (roomId: string) => void;
  onClear: () => void;
}

/** "Ask" + "Your questions" in the employee side menu: every question this session, grouped by whether an expert has it. */
export function HistorySidebar({ items, activeId, open, onToggle, onNew, onPick, onOpenRoom, onClear }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const withRoom = items.filter((i) => i.room), cardsOnly = items.filter((i) => !i.room);
  const liveN = withRoom.filter((i) => i.room!.status === 'live').length;
  const waitN = withRoom.filter((i) => i.room!.status === 'waiting').length;
  const summary = !items.length ? 'Every question you ask lands here, with its room.'
    : [liveN ? `${liveN} live room${liveN > 1 ? 's' : ''}` : null, waitN ? `${waitN} waiting for an expert` : null].filter(Boolean).join(' · ') || 'No open rooms right now.';

  const row = ({ entry: e, room: r }: HistoryItem) => {
    const act = activeId === e.id, k = KIND[e.cardType];
    return (
      <li key={e.id} className={cx('rc-hist-li', act && 'is-active')}>
        <button type="button" className="rc-hist-item" aria-current={act ? 'true' : undefined} onClick={() => onPick(e)}>
          <span className="rc-hist-ic"><Icon name={k.icon} size={14} /></span>
          <span className="rc-hist-body">
            <span className="rc-hist-q">{e.query}</span>
            <span className="rc-hist-meta">{k.label} · {e.at}</span>
          </span>
          {!r && e.state === 'solved' ? <span className="rc-hist-ok" title="Solved by the card"><Icon name="check" size={12} strokeWidth={2.4} /></span> : null}
        </button>
        {r ? (
          <button type="button" className={cx('rc-hist-room', 'is-' + r.status)} disabled={!r.roomId} onClick={() => r.roomId && onOpenRoom(r.roomId)}>
            {r.status === 'solved' ? <Icon name="check" size={12} strokeWidth={2.4} /> : <i className="rc-hist-dot" />}
            <span className="rc-hist-rl">{r.label}</span>
            {r.name ? <span className="rc-hist-rn">{r.name}</span> : null}
            {r.roomId ? <Icon name="chevron" size={13} /> : null}
          </button>
        ) : null}
      </li>
    );
  };

  return (
    <>
      <nav className="rc-tabs" aria-label="Employee">
        <button type="button" className="rc-tab is-on" aria-current="page" onClick={onNew}><Icon name="search" size={20} /><span className="rc-tab-t">Ask</span></button>
        <button type="button" className={cx('rc-tab', 'rc-tab-q', open && 'is-open')} aria-expanded={open} aria-controls="rc-hist-panel" onClick={onToggle}>
          <Icon name="history" size={20} /><span className="rc-tab-t">Your questions</span>
          <span className="rc-tab-n is-neutral">{items.length}</span>
          <Icon name="chevron" size={14} className="rc-tab-chev" />
        </button>
      </nav>
      {open ? (
        <div className="rc-hist-wrap" id="rc-hist-panel">
          <p className="rc-hist-sum">{summary}</p>
          <div className="rc-hist-scroll">
            {!items.length ? <div className="rc-hist-empty"><Icon name="history" size={18} /><span>Ask something. If you hand a question to an expert, its room shows up here so you can jump back in.</span></div> : null}
            {withRoom.length ? <><div className="rc-qgroup">With an expert · {withRoom.length}</div><ul className="rc-hist-list">{withRoom.map(row)}</ul></> : null}
            {cardsOnly.length ? <><div className="rc-qgroup">Answered by cards · {cardsOnly.length}</div><ul className="rc-hist-list">{cardsOnly.map(row)}</ul></> : null}
          </div>
          <footer className="rc-hist-foot">
            <span>This session only</span>
            {items.length ? (
              <button type="button" className={cx('rc-quiet', confirmClear && 'is-warn')} onClick={() => { if (confirmClear) { setConfirmClear(false); onClear(); } else setConfirmClear(true); }}>
                {confirmClear ? 'Tap again to clear' : 'Clear history'}
              </button>
            ) : null}
          </footer>
        </div>
      ) : null}
    </>
  );
}
