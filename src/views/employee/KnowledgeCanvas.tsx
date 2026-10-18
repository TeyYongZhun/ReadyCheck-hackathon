// Design View 1 — the employee's Dynamic Knowledge Canvas.
// At rest: greeting, omni bar, starters. Asking: bar rises, skeleton. Answered: one card. Esc clears.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Attachment, CardSpec, CardState, DashboardItem, HistoryEntry, Scenario } from '../../types';
import { useApp } from '../../state/AppState';
import { DEFAULT_SUGGEST, SCENARIOS, SCEN_THEME, pickScenario } from '../../data/scenarios';
import { clock, cx, greeting, uid } from '../../lib/util';
import { Brand, Icon, Toast, toAttachment } from '../../components/primitives';
import { ChecklistCard, DocSummaryCard, VideoCard } from '../../components/cards/ActionCard';
import { DashboardDock, EscalatedReceipt, EscalationFlight, rectWithin, type Rect } from '../../components/cards/Escalation';
import { OmniBar } from './OmniBar';
import { HistorySidebar, type HistoryItem } from './HistorySidebar';

const USER = { first: 'Mira', last: 'Tan', role: 'Day 3 · Product Design' };
const ASSEMBLE_MS = 950;

interface Flight { id: string; from: Rect; to: Rect; card: CardSpec; scen: Scenario; query: string; files: Attachment[]; entryId: string | null }

export function KnowledgeCanvas({ modeSwitch }: { modeSwitch: ReactNode }) {
  const app = useApp();
  const root = useRef<HTMLDivElement>(null), dock = useRef<HTMLElement>(null);
  const cardEls = useRef<Record<string, HTMLElement | null>>({});
  const tickets = useRef<Record<string, string>>({});
  const seq = useRef(1061);

  const [phase, setPhase] = useState<'idle' | 'loading' | 'results'>('idle');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [scen, setScen] = useState<Scenario | null>(null);
  const [cs, setCs] = useState<Record<string, CardState>>({});
  const [files, setFiles] = useState<Attachment[]>([]);
  const [sent, setSent] = useState<Attachment[]>([]);
  const [esc, setEsc] = useState<DashboardItem[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [dockOpen, setDockOpen] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(() => window.innerWidth > 900);
  const [height, setHeight] = useState(() => Math.max(820, window.innerHeight));

  useEffect(() => {
    const r = () => setHeight(Math.max(820, window.innerHeight));
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const setCard = (id: string, v: CardState) => setCs((s) => ({ ...s, [id]: v }));

  function run(q: string) {
    setDraft(q); setQuery(q); setPhase('loading'); setCs({}); setScen(null); setSent(files); setFiles([]);
    // TODO: replace the regex scenario picker with a real retrieval/LLM call.
    window.setTimeout(() => {
      const s = pickScenario(q), c0 = cardsFor(s)[0], id = uid('h');
      setScen(s); setPhase('results'); setEntryId(id);
      app.history.add({ id, query: q, scen: s.key, cardType: c0.type, title: c0.props.title, heading: s.heading, at: clock(), state: 'viewed', files: files.map(({ name, kind }) => ({ name, kind })) });
    }, ASSEMBLE_MS);
  }

  function clear() {
    if (flight) return;
    setPhase('idle'); setQuery(''); setDraft(''); setScen(null); setCs({}); setSent([]); setEntryId(null);
  }

  function restore(e: HistoryEntry) {
    const s = SCENARIOS.find((x) => x.key === e.scen) ?? pickScenario(e.query), c0 = cardsFor(s)[0];
    setDraft(e.query); setQuery(e.query); setScen(s); setPhase('results'); setEntryId(e.id);
    if (e.ticketId) { tickets.current[c0.id] = e.ticketId; setCs({ [c0.id]: 'escalated' }); }
    else setCs(e.state === 'solved' ? { [c0.id]: 'solved' } : {});
  }

  useEffect(() => {
    const k = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && root.current?.offsetParent !== null) clear(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  /** Approved knowledge for this theme is shown first, marked "From an expert". */
  function cardsFor(s: Scenario): CardSpec[] {
    const theme = SCEN_THEME[s.key as keyof typeof SCEN_THEME];
    const live = app.knowledge.find((k) => k.status === 'live' && k.theme === theme);
    if (!live) return s.cards;
    return [{ id: 'learned-' + live.id, type: 'steps', props: { title: live.title, kindLabel: 'From an expert', source: `AI summary of ${live.roomName} · solved by ${live.pic.first}, approved by Rachel`, steps: live.steps.map((label) => ({ label })) } }, ...s.cards];
  }

  function escalate(card: CardSpec) {
    const el = cardEls.current[card.id];
    if (flight || !el || !root.current || !dock.current || !scen) return;
    const id = 'RC-' + seq.current++;
    tickets.current[card.id] = id;
    setCard(card.id, 'escalating');
    setFlight({ id, from: rectWithin(el, root.current), to: rectWithin(dock.current, root.current), card, scen, query, files: sent, entryId });
  }

  function arrive() {
    const fl = flight; if (!fl) return;
    setPulse((n) => n + 1);
    setEsc((l) => [{ id: fl.id, title: fl.card.props.title, status: 'Routing' }, ...l]);
    setCard(fl.card.id, 'routing');
    setDockOpen(true);
    setToast(fl.id);
    app.escalate({ id: fl.id, title: fl.card.props.title, query: fl.query, kind: fl.card.type, scenario: fl.scen.key as keyof typeof SCEN_THEME, entryId: fl.entryId, files: fl.files.map(({ name, kind }) => ({ name, kind })) });
    window.setTimeout(() => setDockOpen(false), 4200);
    window.setTimeout(() => setToast((t) => (t === fl.id ? null : t)), 5600);
  }

  const active = phase !== 'idle';
  const cards = scen ? cardsFor(scen).slice(0, 1) : [];
  const dockItems = esc.map((x) => {
    const a = app.assignments[x.id];
    return a ? { ...x, status: a.status === 'resolved' ? 'Solved' : a.pic.first, assigned: true } : x;
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
      style={{ height, '--rc-head-top': 172 + (files.length ? 44 : 0) + 'px', '--rc-grid-top': 214 + (files.length ? 44 : 0) + (scen && sent.length ? 26 : 0) + 'px' } as React.CSSProperties}>
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
              <DashboardDock ref={dock} items={dockItems} pulse={pulse} open={dockOpen} team="Routed escalations · live" onClick={() => app.go('manager')} />
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
              <span className="rc-results-h">{scen ? scen.heading : 'Looking across policies, videos and how-tos'}</span>
              {scen ? <span className="rc-results-n">Best match for “{query}”</span> : null}
              {scen && sent.length ? <span className="rc-results-files"><Icon name="clip" size={13} />{sent.length === 1 ? '1 attachment: ' : sent.length + ' attachments: '}{sent.map((f) => f.name).join(', ')}</span> : null}
            </div>
            <button type="button" className="rc-quiet" onClick={clear}>Clear canvas<kbd className="rc-kbd">Esc</kbd></button>
          </div>
        ) : null}

        {active ? (
          <div className="rc-grid">
            {phase === 'loading' ? <div className="rc-grid-item rc-skel"><span /><span /><span /></div> : cards.map((card) => {
              const st = cs[card.id] ?? 'idle';
              if (st === 'routing' || st === 'escalated') {
                const tid = tickets.current[card.id], a = app.assignments[tid];
                return (
                  <div key={card.id} className="rc-grid-item">
                    <EscalatedReceipt id={tid} title={card.props.title} queue={a ? a.pic.team : scen!.queue}
                      expert={a ? { name: a.pic.name, initials: a.pic.initials, eta: 'a few min' } : scen!.expert}
                      status={a ? (a.status === 'resolved' ? 'resolved' : 'picked') : 'routing'} roomName={a?.roomName}
                      onOpenRoom={a ? () => app.setOpenRoom({ id: a.roomId, viewer: 'employee' }) : undefined} onOpenDashboard={() => app.go('manager')} />
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
          <EscalationFlight key={flight.id} from={flight.from} to={flight.to} ticket={{ id: flight.id, title: flight.card.props.title, queue: flight.scen.queue }}
            card={{ kind: flight.card.type, title: flight.card.props.title }} onArrive={arrive} onDone={() => setFlight(null)} />
        ) : null}

        {toast ? (
          <Toast onClose={() => setToast(null)}>
            <span className="rc-toast-id">{toast}</span> is on the Manager Dashboard. A manager will assign the right expert, and you’ll chat with them in a room here.
          </Toast>
        ) : null}
      </div>
    </div>
  );
}
