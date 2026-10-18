// Shared state for both views: escalations flow employee → manager, rooms flow back.
// Everything is in-memory for now. TODO: persist to localStorage key `readycheck.session.v1`
// (history, incoming, assignments, rooms, knowledge, team) like the design export does, or move to a backend.
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Attachment, CardKind, HistoryEntry, KbItem, Message, Mode, Pic, QueueTicket, Room, ThemeKey } from '../types';
import { PICS, QUEUE, ROOMS, SEED_KB, THEMES_BY_KEY } from '../data/command';
import { SCEN_THEME } from '../data/scenarios';
import { clock, slugify, uid } from '../lib/util';

export interface Assignment { roomId: string; roomName: string; pic: Pic; status: 'live' | 'resolved' }

export interface RoomRecord {
  room: Room;
  pic: Pic;
  employee: { name: string; first: string; initials: string };
  ticket: QueueTicket | null;
  messages: Message[];
  typing: false | 'pic' | 'employee';
}

export interface EscalationInput {
  id: string; title: string; query: string; kind: CardKind; scenario: keyof typeof SCEN_THEME; entryId: string | null;
  files: Pick<Attachment, 'name' | 'kind'>[];
}

const ME = { person: 'Mira Tan', first: 'Mira', initials: 'MT', role: 'Product Designer · Day 3' };

function useAppStateValue() {
  const [mode, setMode] = useState<Mode>(location.hash === '#manager' ? 'manager' : 'employee');
  const [queue, setQueue] = useState<QueueTicket[]>(() => QUEUE.map((q) => ({ ...q })));
  const [mine, setMine] = useState<string[]>([]); // ticket ids raised from this employee canvas
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [rooms, setRooms] = useState<Record<string, RoomRecord>>(() => Object.fromEntries(ROOMS.map((r) => [r.id, seedRecord(r)])));
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [knowledge, setKnowledge] = useState<KbItem[]>(() => SEED_KB.map((k) => ({ ...k })));
  const [experts, setExperts] = useState<Pic[]>(PICS);
  const [openRoom, setOpenRoom] = useState<{ id: string; viewer: Mode } | null>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  function go(next: Mode) {
    setMode(next); setOpenRoom(null);
    try { window.history.replaceState(null, '', '#' + next); } catch { /* sandboxed */ }
    window.scrollTo(0, 0);
  }

  function push(roomId: string, msg: Omit<Message, 'id' | 't'>) {
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], typing: false, messages: [...s[roomId].messages, { id: uid('m'), t: clock(), ...msg }] } } : s);
  }
  function setTyping(roomId: string, typing: RoomRecord['typing']) {
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], typing } } : s);
  }

  /** Employee tapped "Need human expert". */
  function escalate(e: EscalationInput) {
    const theme = (SCEN_THEME[e.scenario] ?? 'onb') as ThemeKey;
    const t: QueueTicket = {
      id: e.id, title: e.title, ...ME, theme, wait: 0, isNew: true, from: e.kind + ' card',
      slug: theme + '-' + slugify(ME.first) + '-' + e.id.replace(/\D/g, '').slice(-2),
      q: (e.query ? `“${e.query}” ` : '') + 'Card shown: ' + e.title + '.', files: e.files,
    };
    setQueue((l) => [t, ...l]);
    setMine((l) => [...l, e.id]);
    if (e.entryId) setHistory((l) => l.map((x) => (x.id === e.entryId ? { ...x, state: 'escalated', ticketId: e.id } : x)));
    later(() => setQueue((l) => l.map((x) => (x.id === e.id ? { ...x, isNew: false } : x))), 6000);
  }

  /** Manager assigned an expert to every waiting ticket in a theme. Opens one room for them. */
  function assignTheme(theme: ThemeKey, pic: Pic) {
    const joined = queue.filter((q) => q.theme === theme && !q.leaving);
    if (!joined.length) return null;
    const t = THEMES_BY_KEY[theme];
    const first = joined[0];
    const room: Room = {
      id: uid('r'), ticket: first.id, tickets: joined.map((x) => x.id), name: '#' + (joined.length > 1 ? slugify(t.name) : first.slug),
      theme, pic: pic.id, people: joined.map((x) => x.initials), status: 'live', elapsed: 0, isNew: true,
      last: `${pic.first} joined. ${joined.length > 1 ? joined.length + ' employees have' : first.first + ' has'} been notified.`,
    };
    const ids = joined.map((x) => x.id);
    setQueue((l) => l.map((x) => (ids.includes(x.id) ? { ...x, leaving: true } : x)));
    later(() => setQueue((l) => l.filter((x) => !ids.includes(x.id))), 420);
    later(() => setRooms((s) => s[room.id] ? { ...s, [room.id]: { ...s[room.id], room: { ...s[room.id].room, isNew: false } } } : s), 3200);
    setRooms((s) => ({
      ...s,
      [room.id]: {
        room, pic, ticket: first, typing: 'pic',
        employee: { name: first.person, first: first.first, initials: first.initials },
        messages: [{ id: uid('m'), t: clock(), from: 'system', text: `Rachel Goh assigned ${pic.name} (${pic.team})` }],
      },
    }));
    const ours = ids.filter((id) => mine.includes(id));
    if (ours.length) setAssignments((a) => ({ ...a, ...Object.fromEntries(ours.map((id) => [id, { roomId: room.id, roomName: room.name, pic, status: 'live' as const }])) }));
    // TODO: real expert messages. The export plays per-theme scripted dialogues (DIALOGUES) here.
    later(() => push(room.id, { from: 'pic', text: `Hi ${first.first}, ${pic.first} from ${pic.team}. I’ve read your question and the card you were shown. What do you see right now?` }), 1400);
    return room;
  }

  function send(roomId: string, viewer: Mode, text: string) {
    const rec = rooms[roomId]; if (!rec) return;
    push(roomId, { from: viewer === 'manager' ? 'pic' : 'employee', text });
    if (viewer === 'employee') {
      setTyping(roomId, 'pic');
      // TODO: replace the canned reply with the expert's real response channel.
      later(() => push(roomId, { from: 'pic', text: 'Thanks, that helps. Give me a moment to check on my side.' }), 1600);
    }
  }

  function resolve(roomId: string, by: string) {
    const rec = rooms[roomId]; if (!rec) return;
    setRooms((s) => ({ ...s, [roomId]: { ...s[roomId], room: { ...s[roomId].room, status: 'resolved' } } }));
    push(roomId, { from: 'system', text: 'Marked solved by ' + by });
    setAssignments((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.roomId === roomId ? { ...v, status: 'resolved' as const } : v])));
    // TODO: call the AI summariser. For now a draft card is built from the ticket.
    const kb: KbItem = {
      id: uid('kb'), roomId, roomName: rec.room.name, theme: rec.room.theme, title: 'Updated steps from ' + rec.pic.first,
      problem: rec.ticket?.q ?? 'Solved in ' + rec.room.name, steps: ['Follow the card up to the step that fails', 'Ask ' + rec.pic.team + ' to update your access', 'Try again'],
      pic: rec.pic, employee: rec.employee.first, status: 'review', at: clock(),
    };
    setKnowledge((l) => [kb, ...l]);
    push(roomId, { from: 'system', kind: 'kb', kbId: kb.id, text: 'AI summary added to the knowledge base' });
  }

  function reopen(roomId: string, by: string) {
    setRooms((s) => ({ ...s, [roomId]: { ...s[roomId], room: { ...s[roomId].room, status: 'live' } } }));
    push(roomId, { from: 'system', text: 'Reopened by ' + by });
  }

  const kb = {
    approve: (id: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'live' } : x))),
    discard: (id: string, reason: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'discarded', discardReason: reason } : x))),
    restore: (id: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'review', discardReason: '' } : x))),
    edit: (id: string, patch: Pick<KbItem, 'title' | 'problem' | 'steps'>) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, ...patch, edited: true } : x))),
    add: (item: KbItem) => setKnowledge((l) => [item, ...l]),
  };

  const history_ = {
    add: (e: HistoryEntry) => setHistory((l) => [e, ...l].slice(0, 40)),
    setState: (id: string, state: HistoryEntry['state']) => setHistory((l) => l.map((x) => (x.id === id && x.state !== 'escalated' ? { ...x, state } : x))),
    clear: () => setHistory([]),
  };

  const roomList = useMemo(() => Object.values(rooms).map((r) => withLatest(r)), [rooms]);
  const load = useMemo(() => {
    const m: Record<string, number> = {};
    roomList.forEach((r) => { if (r.status !== 'resolved') m[r.pic] = (m[r.pic] ?? 0) + 1; });
    return m;
  }, [roomList]);

  return {
    mode, go, queue, mine, assignments, rooms, roomList, load, history: history_, historyItems: history, knowledge, kb,
    experts, setExperts, openRoom, setOpenRoom, escalate, assignTheme, send, resolve, reopen,
  };
}

function seedRecord(r: Room): RoomRecord {
  const pic = PICS.find((p) => p.id === r.pic)!;
  const i = r.last.indexOf(': ');
  return {
    room: { ...r }, pic, ticket: null, typing: false,
    employee: { name: r.people[0] ?? 'Employee', first: 'there', initials: r.people[0] ?? '?' },
    messages: [
      { id: uid('m'), t: clock(), from: 'system', text: pic.name + ' opened this room' },
      { id: uid('m'), t: clock(), from: 'pic', text: i > 0 && i < 20 ? r.last.slice(i + 2) : r.last },
    ],
  };
}

/** The room as the tables show it: status plus the latest message line. */
function withLatest(r: RoomRecord): Room {
  const last = r.messages.filter((m) => m.from !== 'system').slice(-1)[0];
  if (!last) return r.room;
  const who = last.from === 'pic' ? r.pic.first : r.employee.first === 'there' ? r.employee.name : r.employee.first;
  return { ...r.room, last: who + ': ' + last.text };
}

type AppState = ReturnType<typeof useAppStateValue>;
const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const value = useAppStateValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppStateProvider>');
  return v;
}
