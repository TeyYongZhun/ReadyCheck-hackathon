// Design View 1 — the employee's Dynamic Knowledge Canvas.
// At rest: greeting, omni bar, starters. Asking: bar rises, skeleton. Answered: one card. Esc clears.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Attachment, CanvasAnswer, CardSpec, CardState, ChatReply, DashboardItem, HistoryEntry } from '../../types';
import { useApp } from '../../state/AppState';
import { DEFAULT_SUGGEST } from '../../data/scenarios';
import { isChat, resolveAnswer } from '../../lib/answer';
import { clock, cx, greeting, uid } from '../../lib/util';
import { Brand, Icon, Toast, toAttachment } from '../../components/primitives';
import { ActionCard, ChecklistCard, DocSummaryCard, VideoCard } from '../../components/cards/ActionCard';
import { DashboardDock, EscalatedReceipt, EscalationFlight, rectWithin, type Rect } from '../../components/cards/Escalation';
import { OmniBar } from './OmniBar';
import { HistorySidebar, type HistoryItem } from './HistorySidebar';

const USER = { first: 'Mira', last: 'Tan', role: 'Day 3 · Product Design' };
interface Flight { id: string; from: Rect; to: Rect; card: CardSpec; ans: CanvasAnswer; query: string; files: Attachment[]; entryId: string | null }

export function KnowledgeCanvas({ modeSwitch }: { modeSwitch: ReactNode }) {
  const app = useApp();
  const root = useRef<HTMLDivElement>(null), dock = useRef<HTMLElement>(null);
  const cardEls = useRef<Record<string, HTMLElement | null>>({});
  const tickets = useRef<Record<string, string>>({});
  const seq = useRef(1061);
  const askNo = useRef(0); // ignores answers that arrive after the canvas moved on

  const [phase, setPhase] = useState<'idle' | 'loading' | 'results'>('idle');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [ans, setAns] = useState<CanvasAnswer | null>(null);
  const [chat, setChat] = useState<ChatReply | null>(null);
  const [cs, setCs] = useState<Record<string, CardState>>({});
  const [files, setFiles] = useState<Attachment[]>([]);
  const [sent, setSent] = useState<Attachment[]>([]);
  const [esc, setEsc] = useState<DashboardItem[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [dockOpen, setDockOpen] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  // Closed by default so the first screen stays clear; the count on "Your questions" still updates.
  const [sideOpen, setSideOpen] = useState(false);
  const [winH, setHeight] = useState(() => window.innerHeight);
  // Bottom edge of the answer card, so the canvas (which clips its children) grows with it and the page can scroll.
  const gridRef = useRef<HTMLDivElement>(null);
  const [contentBottom, setContentBottom] = useState(0);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) { setContentBottom(0); return; }
    const measure = () => setContentBottom(el.offsetTop + el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  useEffect(() => {
    const r = () => setHeight(window.innerHeight);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const setCard = (id: string, v: CardState) => setCs((s) => ({ ...s, [id]: v }));

  async function run(q: string) {
    const no = ++askNo.current, mine = files;
    setDraft(q); setQuery(q); setPhase('loading'); setCs({}); setAns(null); setChat(null); setSent(mine); setFiles([]);
    const a = await resolveAnswer(q, mine.map((f) => f.name), app.knowledge);
    if (no !== askNo.current) return;
    if (isChat(a)) {
      // Small talk: a short reply, no card, not saved to "Your questions". Empty the bar for their real question.
      setChat(a); setPhase('results'); setEntryId(null); setDraft('');
      return;
    }
    const id = uid('h');
    setAns(a); setPhase('results'); setEntryId(id);
    app.history.add({ id, query: q, answer: a, cardType: a.card.type, title: a.card.props.title, heading: a.heading, at: clock(), state: 'viewed', files: mine.map(({ name, kind }) => ({ name, kind })) });
  }

  function clear() {
    if (flight) return;
    askNo.current++;
    setPhase('idle'); setQuery(''); setDraft(''); setAns(null); setChat(null); setCs({}); setSent([]); setEntryId(null);
  }

  function restore(e: HistoryEntry) {
    askNo.current++;
    const c0 = e.answer.card;
    setDraft(e.query); setQuery(e.query); setAns(e.answer); setChat(null); setPhase('results'); setEntryId(e.id);
    if (e.ticketId) { tickets.current[c0.id] = e.ticketId; setCs({ [c0.id]: 'escalated' }); }
    else setCs(e.state === 'solved' ? { [c0.id]: 'solved' } : {});
  }

  useEffect(() => {
    const k = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && root.current?.offsetParent !== null) clear(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  function escalate(card: CardSpec) {
    const el = cardEls.current[card.id];
    if (flight || !el || !root.current || !dock.current || !ans) return;
    const id = 'RC-' + seq.current++;
    tickets.current[card.id] = id;
    setCard(card.id, 'escalating');
    setFlight({ id, from: rectWithin(el, root.current), to: rectWithin(dock.current, root.current), card, ans, query, files: sent, entryId });
  }

  function arrive() {
    const fl = flight; if (!fl) return;
    setPulse((n) => n + 1);
    setEsc((l) => [{ id: fl.id, title: fl.card.props.title, state: 'waiting', status: 'Waiting for an expert' }, ...l]);
    setCard(fl.card.id, 'routing');
    setDockOpen(true);
    setToast(fl.id);
    app.escalate({ id: fl.id, title: fl.card.props.title, query: fl.query, kind: fl.card.type, theme: fl.ans.theme, entryId: fl.entryId, files: fl.files.map(({ name, kind }) => ({ name, kind })) });
    window.setTimeout(() => setDockOpen(false), 4200);
    window.setTimeout(() => setToast((t) => (t === fl.id ? null : t)), 5600);
  }

  const active = phase !== 'idle';
  // At rest the canvas fits the window exactly (no scroll); with a card on it, leave room for the card.
  const height = active ? Math.max(820, winH, contentBottom + 64) : Math.max(560, winH);
  const cards = ans ? [ans.card] : [];
  const dockItems: DashboardItem[] = esc.map((x) => {
    const a = app.assignments[x.id];
    if (!a) return x;
    const solved = a.status === 'resolved' || app.rooms[a.roomId]?.room.status === 'resolved';
    return { ...x, state: solved ? 'solved' : 'live', status: solved ? 'Solved' : 'With ' + a.pic.first, roomId: a.roomId };
  });

  const historyItems: HistoryItem[] = app.historyItems.map((e) => {
    if (!e.ticketId) return { entry: e, room: null };
    const a = app.assignments[e.ticketId];
    if (!a) return { entry: e, room: { status: 'waiting', label: 'Waiting for an expert' } };
    const solved = a.status === 'resolved' || app.rooms[a.roomId]?.room.status === 'resolved';
    return { entry: e, room: { status: solved ? 'solved' : 'live', label: (solved ? 'Solved with ' : 'Live with ') + a.pic.first, name: a.roomName, roomId: a.roomId } };
  });

  return (
    <div ref={root} className={cx('rc-canvas', active && 'is-active', 'is-single', 'has-side')}
      style={{ height, '--rc-head-top': 200 + (files.length ? 44 : 0) + 'px', '--rc-grid-top': 242 + (files.length ? 44 : 0) + (ans && sent.length ? 26 : 0) + (ans?.source === 'offline' ? 22 : 0) + 'px' } as React.CSSProperties}>
      <div className="rc-canvas-orb rc-canvas-orb-a" aria-hidden />
      <div className="rc-canvas-orb rc-canvas-orb-b" aria-hidden />

      <aside className="rc-side rc-side-emp" aria-label="Employee">
        <Brand />
        <div className="rc-side-mode">{modeSwitch}</div>
        <HistorySidebar items={historyItems} activeId={entryId} open={sideOpen} onToggle={() => setSideOpen((v) => !v)}
          onNew={clear} onPick={restore} onOpenRoom={(id) => app.setOpenRoom({ id, viewer: 'employee' })} onClear={() => { app.history.clear(); setEntryId(null); }} />
        <div className="rc-user rc-side-user">
          <span className="rc-avatar">{USER.first[0] + USER.last[0]}</span>
          <div><div className="rc-user-n">{USER.first} {USER.last}</div><div className="rc-user-s">{USER.role}</div></div>
        </div>
      </aside>

      <div className="rc-emp-main">
        <header className="rc-topbar">
          <div className="rc-topbar-right">
            <div className="rc-dock-slot">
              <DashboardDock ref={dock} items={dockItems} pulse={pulse} open={dockOpen} onOpenRoom={(id) => app.setOpenRoom({ id, viewer: 'employee' })} />
            </div>
          </div>
        </header>

        <div className="rc-hello" aria-hidden={active}>
          <h1 className="rc-hello-h">{greeting(USER.first)}</h1>
          <p className="rc-hello-s">Ask about tools, policies, people or your first weeks. Answers come back as cards you can act on.</p>
        </div>

        <div className="rc-omni-wrap">
          <OmniBar value={draft} onChange={setDraft} onSubmit={run} busy={phase === 'loading'} compact={active} autoFocus
            suggestions={active ? null : DEFAULT_SUGGEST} placeholder="Describe the work issue you need help with…"
            attachments={files} onAttach={(l) => setFiles((f) => [...f, ...Array.from(l).map(toAttachment)].slice(0, 5))}
            onRemoveAttachment={(id) => setFiles((l) => l.filter((f) => f.id !== id))} />
        </div>

        {active ? (
          <div className="rc-results-head">
            <div>
              <span className="rc-results-h">{ans ? ans.heading : chat ? chat.heading : 'Looking across policies, videos and how-tos'}</span>
              {ans ? <span className="rc-results-n">Best match for “{query}”</span> : null}
              {chat ? <span className="rc-results-n">Reply to “{query}”</span> : null}
              {ans?.source === 'offline' ? <span className="rc-results-files">Offline answer (AI unavailable): matched by keywords.</span> : null}
              {ans && sent.length ? <span className="rc-results-files"><Icon name="clip" size={13} />{sent.length === 1 ? '1 attachment: ' : sent.length + ' attachments: '}{sent.map((f) => f.name).join(', ')}</span> : null}
            </div>
            <button type="button" className="rc-quiet" onClick={clear}>Clear canvas<kbd className="rc-kbd">Esc</kbd></button>
          </div>
        ) : null}

        {active ? (
          <div className="rc-grid" ref={gridRef}>
            {phase === 'loading' ? <div className="rc-grid-item rc-skel"><span /><span /><span /></div> : chat ? (
              <div className="rc-grid-item">
                <ActionCard kind="answer" kindLabel={chat.source === 'ai' ? 'AI reply' : 'ReadyCheck'} title={chat.message} feedback={false}
                  source="Describe a work issue in the bar above and I’ll find the right card for you." />
              </div>
            ) : cards.map((card) => {
              const st = cs[card.id] ?? 'idle';
              if (st === 'routing' || st === 'escalated') {
                const tid = tickets.current[card.id], a = app.assignments[tid];
                return (
                  <div key={card.id} className="rc-grid-item">
                    <EscalatedReceipt id={tid} title={card.props.title} queue={a ? a.pic.team : ans!.queue}
                      expert={a ? { name: a.pic.name, initials: a.pic.initials, eta: 'a few min' } : ans!.expert}
                      status={a ? (a.status === 'resolved' ? 'resolved' : 'picked') : 'routing'} roomName={a?.roomName}
                      onOpenRoom={a ? () => app.setOpenRoom({ id: a.roomId, viewer: 'employee' }) : undefined} />
                  </div>
                );
              }
              const handlers = {
                ref: (el: HTMLElement | null) => { cardEls.current[card.id] = el; },
                state: st,
                onSolved: () => { setCard(card.id, 'solved'); if (entryId) app.history.setState(entryId, 'solved'); },
                onUndo: () => { setCard(card.id, 'idle'); if (entryId) app.history.setState(entryId, 'viewed'); },
                onEscalate: () => escalate(card),
              };
              return (
                <div key={card.id} className="rc-grid-item">
                  {card.type === 'video' ? <VideoCard {...card.props} {...handlers} />
                    : card.type === 'doc' ? <DocSummaryCard {...card.props} {...handlers} />
                    : <ChecklistCard {...card.props} {...handlers} />}
                </div>
              );
            })}
          </div>
        ) : null}

        {flight ? (
          <EscalationFlight key={flight.id} from={flight.from} to={flight.to} ticket={{ id: flight.id, title: flight.card.props.title, queue: flight.ans.queue }}
            card={{ kind: flight.card.type, title: flight.card.props.title }} onArrive={arrive} onDone={() => setFlight(null)} />
        ) : null}

        {toast ? (
          <Toast onClose={() => setToast(null)}>
            <span className="rc-toast-id">{toast}</span> is with the support team. They’ll pick the right expert, and you’ll chat in a room from My tickets.
          </Toast>
        ) : null}
      </div>
    </div>
  );
}
