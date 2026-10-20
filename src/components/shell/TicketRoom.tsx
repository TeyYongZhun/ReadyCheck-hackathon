import { useEffect, useRef, useState } from 'react';
import type { KbItem, Mode } from '../../types';
import type { RoomRecord } from '../../state/AppState';
import { cx } from '../../lib/util';
import { AttachChips, BrandMark, Icon, PicAvatar, Person } from '../primitives';
import { KbCard } from './KbCard';

const MANAGER = { name: 'Rachel Goh', initials: 'RG' };

interface TicketRoomProps {
  rec: RoomRecord;
  viewer: Mode;
  knowledge: Record<string, KbItem>;
  onClose: () => void;
  onSend: (text: string) => void;
  onResolve: () => void;
  onFeedback: (solved: boolean) => void;
  on1v1: (book: boolean) => void;
  onDemo: () => void;
  onStopDemo: () => void;
  onReopen: () => void;
  onApproveKb?: (id: string) => void;
}

/** The side sheet where the expert and the employee talk. Opens over either view. */
export function TicketRoom({ rec, viewer, knowledge, onClose, onSend, onResolve, onFeedback, on1v1, onDemo, onStopDemo, onReopen, onApproveKb }: TicketRoomProps) {
  const { room, pic, employee, ticket } = rec;
  const me = viewer === 'manager' ? 'manager' : 'employee', isEmp = viewer === 'employee';
  const resolved = room.status === 'resolved';
  const asking = !resolved && (rec.feedback === 'ask' || rec.feedback === 'ask1v1') && !rec.typing;
  const listRef = useRef<HTMLOListElement>(null), inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [rec.messages.length, rec.typing, rec.feedback]);
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, [room.id]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);

  const demo = !!rec.demo;
  const canDemo = !resolved && !demo && !rec.typing && !asking;
  function send(text: string) { const t = text.trim(); if (!t || resolved || demo) return; onSend(t); setDraft(''); }
  const who = {
    pic: { name: pic.name, el: <PicAvatar pic={pic} size={30} /> },
    employee: { name: employee.name, el: <Person initials={employee.initials} className="rc-msg-person" /> },
    manager: { name: MANAGER.name, el: <Person initials={MANAGER.initials} className="rc-msg-person" /> },
  };
  const extra = Math.max(0, room.people.length - 1);

  return (
    <div className="rc-roomlayer" role="dialog" aria-modal aria-label={'Ticket room ' + room.name}>
      <div className="rc-roomlayer-scrim" onClick={onClose} />
      <section className="rc-troom rc-glass rc-glass-3">
        <header className="rc-troom-head">
          <div className="rc-troom-row">
            <span className="rc-troom-name">{room.name}</span>
            <span className={cx('rc-room-st', resolved ? 'is-resolved' : 'is-live')}>{resolved ? <Icon name="check" size={12} strokeWidth={2.4} /> : <i />}{resolved ? 'Resolved' : 'Live'}</span>
            <button type="button" className="rc-toast-x rc-troom-x" aria-label="Close room" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>
          <div className="rc-troom-people">
            <PicAvatar pic={pic} size={36} />
            <div className="rc-troom-who">
              <div className="rc-troom-pn">{pic.name}<span className="rc-troom-role">Person in charge</span></div>
              <div className="rc-troom-ps">{pic.team} · with {employee.name}{extra ? ` and ${extra} more` : ''}</div>
            </div>
            {isEmp && !resolved ? <button type="button" className="rc-solve" onClick={onResolve}><Icon name="check" size={14} strokeWidth={2.2} />Mark solved</button> : null}
          </div>
          {viewer === 'manager' ? <div className="rc-troom-note">You’re in this room as {MANAGER.name} (Manager). Your messages are labelled as yours, not {pic.first}’s.</div> : null}
        </header>

        {ticket ? (
          <div className="rc-troom-ctx">
            <div className="rc-troom-ctx-k"><Icon name="route" size={13} />Escalated {ticket.id} · skipped the {ticket.from}</div>
            <p className="rc-troom-ctx-q">{ticket.q}</p>
            {ticket.files?.length ? <AttachChips items={ticket.files} className="rc-att-ctx" /> : null}
          </div>
        ) : null}

        <ol className="rc-thread" ref={listRef} aria-live="polite">
          {rec.messages.map((m) => {
            if (m.kind === 'kb' && m.kbId && knowledge[m.kbId]) return <li key={m.id} className="rc-msg-kb"><KbCard kb={knowledge[m.kbId]} onApprove={viewer === 'manager' ? onApproveKb : undefined} /></li>;
            if (m.kind === 'booked') return <li key={m.id} className="rc-msg-event"><span className="rc-msg-event-ic"><Icon name="calendar" size={16} /></span><span><b>1:1 booked</b>{m.text}</span></li>;
            if (m.from === 'system') return <li key={m.id} className="rc-msg-sys"><span>{m.text}</span></li>;
            const w = who[m.from];
            return (
              <li key={m.id} className={cx('rc-msg', m.from === me && 'is-me', 'is-' + m.from)}>
                {w.el}
                <div className="rc-msg-b">
                  <div className="rc-msg-meta">
                    <b>{m.from === me ? 'You' : w.name.split(' ')[0]}</b>{m.from === 'manager' ? ' (Manager)' : ''} · {m.t}
                    {m.ai ? <> · <span className="rc-ai-label" title="Written by Gemini standing in for the expert">AI expert (demo)</span></> : null}
                    {m.scripted ? <> · <span className="rc-ai-label" title="Part of the scripted sample conversation">Sample</span></> : null}
                  </div>
                  <div className="rc-msg-text">{m.text}</div>
                </div>
              </li>
            );
          })}
          {rec.typing ? (
            <li className={cx('rc-msg-typing', rec.typing === 'ai' && 'is-ai')}>
              <span className="rc-dots" aria-hidden><i /><i /><i /></span>
              {rec.typing === 'ai' ? 'ReadyCheck AI is summarising this room' : (rec.typing === 'employee' ? employee.first : pic.first) + ' is typing'}
            </li>
          ) : null}
          {asking ? (
            <li className="rc-msg-ask">
              <div className="rc-ask">
                <div className="rc-ask-k"><BrandMark small />ReadyCheck</div>
                {rec.feedback === 'ask1v1' ? (
                  <>
                    <p className="rc-ask-q">Sorry it isn’t sorted yet. Would a 1:1 session with {pic.first} help?</p>
                    {isEmp ? (
                      <>
                        <p className="rc-ask-s">{pic.first} will meet you at the {pic.team} desk or on Meet, in the next free half hour.</p>
                        <div className="rc-ask-act">
                          <button type="button" className="rc-btn-primary is-sm" onClick={() => on1v1(true)}><Icon name="calendar" size={15} />Book a 1:1</button>
                          <button type="button" className="rc-btn-ghost is-sm" onClick={() => on1v1(false)}>No, keep chatting</button>
                        </div>
                      </>
                    ) : <p className="rc-ask-s">Waiting for {employee.first}’s answer.</p>}
                  </>
                ) : (
                  <>
                    <p className="rc-ask-q">Did {pic.first} solve your problem?</p>
                    {isEmp ? (
                      <>
                        <p className="rc-ask-s">If yes, ReadyCheck AI will summarise this room into a card, so the next new hire with this problem gets the answer straight away.</p>
                        <div className="rc-ask-act">
                          <button type="button" className="rc-btn-primary is-sm" onClick={() => onFeedback(true)}><Icon name="check" size={15} strokeWidth={2.2} />Yes, it’s solved</button>
                          <button type="button" className="rc-btn-ghost is-sm" onClick={() => onFeedback(false)}>Not yet</button>
                        </div>
                      </>
                    ) : <p className="rc-ask-s">Waiting for {employee.first}’s answer.</p>}
                  </>
                )}
              </div>
            </li>
          ) : null}
        </ol>

        {resolved ? (
          <div className="rc-troom-done">
            <span className="rc-fb-tick"><Icon name="check" size={13} strokeWidth={2.2} /></span>
            Solved. The summary is saved to the knowledge base.
            <button type="button" className="rc-quiet" onClick={onReopen}>Reopen</button>
          </div>
        ) : (
          <div className="rc-troom-compose">
            <div className="rc-troom-quick">
              {demo ? (
                <button type="button" className="rc-demo" onClick={onStopDemo}><span className="rc-demo-k">Demo</span><Icon name="pause" size={12} />Stop sample conversation</button>
              ) : canDemo ? (
                <button type="button" className="rc-demo" onClick={onDemo}><span className="rc-demo-k">Demo</span><Icon name="play" size={12} />Play sample conversation</button>
              ) : null}
              {isEmp && !demo && !asking
                ? ['It’s working now', 'Still not working', 'Can we do a quick call?'].map((q) => <button key={q} type="button" className="rc-chip" onClick={() => send(q)}>{q}</button>)
                : null}
            </div>
            <form className="rc-composer" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
              <input ref={inputRef} className="rc-composer-input" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" aria-label="Message" disabled={demo}
                placeholder={demo ? 'Playing the sample conversation…' : viewer === 'manager' ? `Reply as ${MANAGER.name} (Manager)` : 'Message ' + pic.first} />
              <button type="submit" className="rc-omni-go" aria-label="Send" disabled={!draft.trim() || demo}><Icon name="arrow" size={17} strokeWidth={1.9} /></button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
